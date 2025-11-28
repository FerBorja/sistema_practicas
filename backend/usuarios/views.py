from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import PerfilUsuario
from .serializers import RegistroSerializer, UserSerializer

User = get_user_model()


class RegistroView(APIView):
    """
    POST /api/auth/registro/
    Crea usuario + perfil estándar (ESTANDAR) validando correo @uach.mx.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        nombre_completo = serializer.validated_data["nombre_completo"]
        matricula = serializer.validated_data["matricula_o_empleado"]
        email = (serializer.validated_data["email"] or "").strip().lower()
        password = serializer.validated_data["password"]

        if not email.endswith("@uach.mx"):
            return Response(
                {"detail": "El correo debe ser institucional (@uach.mx)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"detail": "Ya existe un usuario con ese correo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Usamos el correo como username
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=nombre_completo,  # sin separar nombre/apellido por ahora
        )

        PerfilUsuario.objects.create(
            user=user,
            matricula_o_empleado=matricula,
            rol="ESTANDAR",
        )

        return Response(
            {"detail": "Usuario registrado correctamente."},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/auth/login/
    Espera:  { "email": "...", "password": "..." }
    Devuelve: { "access": "...", "refresh": "..." }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""

        if not email or not password:
            return Response(
                {"detail": "Email y contraseña son requeridos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = None

        # 1) Buscar usuario por email
        try:
            user_obj = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # 2) Fallback: intentar con username = parte antes de @ (por si cambia a futuro)
            username = email.split("@")[0]
            user = authenticate(username=username, password=password)
        else:
            user = authenticate(username=user_obj.username, password=password)

        if user is None:
            return Response(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "Cuenta inactiva."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_200_OK,
        )


class PerfilView(APIView):
    """
    GET /api/auth/perfil/

    Devuelve un objeto con:
    {
      "user": { ...campos de usuario... },
      "perfil": {
        "rol": "ESTANDAR" | "ADMIN",
        "matricula_o_empleado": "..."
      } | null
    }
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        user_data = UserSerializer(user).data

        # Puede o no tener PerfilUsuario
        perfil = getattr(user, "perfil", None)
        if perfil is not None:
            perfil_data = {
                "rol": perfil.rol,
                "matricula_o_empleado": perfil.matricula_o_empleado,
            }
        else:
            perfil_data = None

        return Response(
            {
                "user": user_data,
                "perfil": perfil_data,
            },
            status=status.HTTP_200_OK,
        )
