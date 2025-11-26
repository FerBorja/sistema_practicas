from django.conf import settings
from django.db import models


class PerfilUsuario(models.Model):
    ESTANDAR = 'ESTANDAR'
    ADMIN = 'ADMIN'

    ROL_CHOICES = [
        (ESTANDAR, 'Usuario estándar'),
        (ADMIN, 'Administrador'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='perfil'
    )
    matricula_o_empleado = models.CharField(max_length=50)
    rol = models.CharField(
        max_length=20,
        choices=ROL_CHOICES,
        default=ESTANDAR,
    )

    def __str__(self):
        return f'{self.user.get_full_name()} ({self.matricula_o_empleado})'
