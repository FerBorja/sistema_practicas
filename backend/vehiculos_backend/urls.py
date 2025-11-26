from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from reservas.views import VehiculoViewSet, ReservaViewSet

router = DefaultRouter()
router.register('vehiculos', VehiculoViewSet, basename='vehiculo')
router.register('reservas', ReservaViewSet, basename='reserva')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
