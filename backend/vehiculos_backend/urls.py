from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from reservas.views import VehiculoViewSet, ReservaViewSet

router = DefaultRouter()
router.register('vehiculos', VehiculoViewSet, basename='vehiculo')
router.register('reservas', ReservaViewSet, basename='reserva')

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth de usuarios (registro + perfil)
    path('api/auth/', include('usuarios.urls')),

    # JWT login / refresh
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Rutas principales de la API (vehículos y reservas)
    path('api/', include(router.urls)),
]
