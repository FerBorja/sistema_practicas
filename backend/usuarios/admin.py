from django.contrib import admin
from .models import PerfilUsuario

@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
    list_display = ('user', 'matricula_o_empleado', 'rol')
    search_fields = ('user__username', 'user__email', 'matricula_o_empleado')
