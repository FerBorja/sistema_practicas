from rest_framework import serializers
from .models import Vehiculo, Reserva


class VehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = ['id', 'nombre', 'tipo', 'capacidad_pasajeros', 'requiere_chofer_oficial', 'activo']


class ReservaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reserva
        fields = '__all__'
        read_only_fields = ['usuario', 'created_at']
