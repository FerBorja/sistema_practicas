from django.contrib.auth.models import User
from rest_framework import serializers

from .models import PerfilUsuario


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = PerfilUsuario
        fields = ['user', 'matricula_o_empleado', 'rol']


class RegistroSerializer(serializers.Serializer):
    nombre_completo = serializers.CharField(max_length=150)
    matricula_o_empleado = serializers.CharField(max_length=50)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value: str) -> str:
        if not value.lower().endswith('@uach.mx'):
            raise serializers.ValidationError(
                'El correo debe ser institucional (@uach.mx).'
            )
        return value

    def create(self, validated_data):
        nombre_completo = validated_data['nombre_completo']
        matricula = validated_data['matricula_o_empleado']
        email = validated_data['email']
        password = validated_data['password']

        # username = parte antes de @
        username = email.split('@')[0]

        first_name = nombre_completo
        last_name = ''

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )

        PerfilUsuario.objects.create(
            user=user,
            matricula_o_empleado=matricula,
            rol='ESTANDAR',  # por defecto
        )

        return user
