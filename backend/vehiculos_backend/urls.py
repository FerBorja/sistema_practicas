# backend/vehiculos_backend/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from reservas.views import VehiculoViewSet, ReservaViewSet

router = DefaultRouter()
router.register(r"vehiculos", VehiculoViewSet, basename="vehiculo")
router.register(r"reservas", ReservaViewSet, basename="reserva")

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth de usuarios (registro, login custom por email, perfil)
    # Aquí van:
    #   /api/auth/registro/
    #   /api/auth/login/
    #   /api/auth/perfil/
    path("api/auth/", include("usuarios.urls")),

    # Endpoints JWT "crudos" (opcionales, para pruebas con username/password)
    # No chocan con /api/auth/login/ porque usan otra ruta base.
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Rutas principales de la API (vehículos y reservas)
    path("api/", include(router.urls)),
]
