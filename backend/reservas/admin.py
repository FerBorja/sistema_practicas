from django.contrib import admin
from .models import Vehiculo, Chofer, Reserva, UserProfile

admin.site.register(Vehiculo)
admin.site.register(Chofer)
admin.site.register(Reserva)
admin.site.register(UserProfile)
