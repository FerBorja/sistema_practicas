from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    matricula_o_num_empleado = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.matricula_o_num_empleado})"


class Vehiculo(models.Model):
    TIPO_CHOICES = [
        ('VAN', 'Van'),
        ('CAMION', 'Camión'),
    ]

    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    capacidad_pasajeros = models.PositiveIntegerField()
    requiere_chofer_oficial = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre} ({self.capacidad_pasajeros} pax)"


class Chofer(models.Model):
    nombre = models.CharField(max_length=100)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre


class Reserva(models.Model):
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('AUTORIZADA', 'Autorizada'),
        ('RECHAZADA', 'Rechazada'),
        ('CANCELADA', 'Cancelada'),
    ]

    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, null=True, blank=True)
    chofer1 = models.ForeignKey(Chofer, on_delete=models.SET_NULL, null=True, blank=True, related_name='reserva_chofer1')
    chofer2 = models.ForeignKey(Chofer, on_delete=models.SET_NULL, null=True, blank=True, related_name='reserva_chofer2')

    destino_texto = models.CharField(max_length=255)
    destino_lat = models.FloatField(null=True, blank=True)
    destino_lng = models.FloatField(null=True, blank=True)
    es_fuera_chihuahua = models.BooleanField(default=False)

    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    personas_viajan = models.PositiveIntegerField()

    duracion_horas = models.FloatField(default=0)
    requiere_dos_choferes = models.BooleanField(default=False)
    requiere_chofer_oficial = models.BooleanField(default=False)

    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    creada_por_admin = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reserva #{self.id} - {self.destino_texto}"
