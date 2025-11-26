from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth.models import User

from .models import PerfilUsuario
from .serializers import (
    RegistroSerializer,
    UserSerializer,
    PerfilUsuarioSerializer,
)


class RegistroView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    'detail': 'Registro exitoso.',
                    'user': UserSerializer(user).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PerfilView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user: User = request.user
        perfil = getattr(user, 'perfil', None)
        data = {
            'user': UserSerializer(user).data,
            'perfil': PerfilUsuarioSerializer(perfil).data if perfil else None,
        }
        return Response(data)
