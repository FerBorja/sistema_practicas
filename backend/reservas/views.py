from datetime import date, timedelta

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import Chofer, Reserva, Vehiculo
from .serializers import ReservaSerializer, VehiculoSerializer


class VehiculoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Vehiculo.objects.filter(activo=True)
    serializer_class = VehiculoSerializer
    permission_classes = [permissions.AllowAny]


class ReservaViewSet(viewsets.ModelViewSet):
    """
    - Usuario estándar: ve sólo SUS reservas.
    - Admin (perfil.rol == 'ADMIN' o is_staff/superuser): ve TODAS.
    """
    serializer_class = ReservaSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Reserva.objects.all().order_by('-created_at')

        if not user.is_authenticated:
            return qs.none()

        if self._es_admin(user):
            return qs

        # Usuario estándar
        return qs.filter(usuario=user)

    def perform_create(self, serializer):
        """
        El usuario autenticado se guarda como 'usuario' de la reserva.
        """
        user = self.request.user
        serializer.save(usuario=user)

    # --------- /api/reservas/disponibilidad/ ---------
    @action(detail=False, methods=['post'], url_path='disponibilidad')
    def disponibilidad(self, request):
        data = request.data

        # 1) Parseo de fechas
        try:
            fecha_inicio = date.fromisoformat(data.get('fecha_inicio'))
            fecha_fin = date.fromisoformat(data.get('fecha_fin'))
        except Exception:
            return Response(
                {'detail': 'Fechas inválidas. Usa formato YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if fecha_fin < fecha_inicio:
            return Response(
                {'detail': 'La fecha final no puede ser anterior a la fecha inicial.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2) Personas que viajan
        try:
            personas_viajan = int(data.get('personas_viajan', 0))
        except Exception:
            personas_viajan = 0

        if personas_viajan <= 0:
            return Response(
                {'detail': 'Debes indicar el número de personas que viajan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3) Destino en texto
        destino_texto = data.get('destino_texto')
        if not destino_texto:
            return Response(
                {'detail': 'Debes indicar el destino (texto).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 4) Tipo de vehículo y si la VAN necesita chofer UACH
        tipo = data.get('tipo')  # 'VAN', 'CAMION' o None
        van_necesita_chofer = self._parse_bool(data.get('van_necesita_chofer'))

        # 5) Calcular duración y estado con ORS
        try:
            duracion_horas, es_fuera_chihuahua = self._obtener_duracion_y_estado_ors(
                destino_texto
            )
        except Exception as e:
            return Response(
                {'detail': f'No se pudo calcular la ruta con OpenRouteService: {e}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 6) Regla de anticipación (7 o 14 días)
        hoy = timezone.now().date()
        min_dias = 14 if es_fuera_chihuahua else 7
        if fecha_inicio < hoy + timedelta(days=min_dias):
            return Response(
                {
                    'detail': (
                        f'El viaje debe apartarse con al menos {min_dias} días '
                        f'naturales de anticipación.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 7) Candidatos: todos los vehículos activos (y opcionalmente por tipo)
        vehiculos_qs = Vehiculo.objects.filter(activo=True)
        if tipo:
            vehiculos_qs = vehiculos_qs.filter(tipo=tipo)

        vehiculos_disponibles = []

        for vehiculo in vehiculos_qs:
            # 7.1 No exceder la capacidad del vehículo
            if personas_viajan > vehiculo.capacidad_pasajeros:
                continue

            # 7.2 Regla del 75% de ocupación mínima
            min_ocupacion = int(vehiculo.capacidad_pasajeros * 0.75 + 0.9999)  # ceil
            if personas_viajan < min_ocupacion:
                continue

            # 7.3 Disponibilidad del vehículo en el rango de fechas (incluyendo 3 días de descanso)
            if not self._vehiculo_disponible_en_fechas(vehiculo, fecha_inicio, fecha_fin):
                continue

            # 7.4 Choferes oficiales disponibles (si aplica)
            if not self._tiene_choferes_disponibles(
                vehiculo,
                fecha_inicio,
                fecha_fin,
                duracion_horas,
                van_necesita_chofer,
            ):
                continue

            vehiculos_disponibles.append(vehiculo)

        serializer = VehiculoSerializer(vehiculos_disponibles, many=True)

        return Response(
            {
                'vehiculos_disponibles': serializer.data,
                'duracion_horas': duracion_horas,
                'es_fuera_chihuahua': es_fuera_chihuahua,
                'requiere_dos_choferes': duracion_horas > 6,
            }
        )

    # --------- Sugerencias de destino (autocomplete) ---------
    @action(detail=False, methods=['get'], url_path='sugerencias-destino')
    def sugerencias_destino(self, request):
        """
        GET /api/reservas/sugerencias-destino/?q=texto
        Devuelve una lista de sugerencias para autocompletar destinos.
        """
        q = (request.query_params.get('q') or '').strip()
        if len(q) < 3:
            # Menos de 3 caracteres: no molestamos a la API, devolvemos vacío
            return Response([], status=status.HTTP_200_OK)

        try:
            sugerencias = self._geocode_sugerencias_ors(q, max_resultados=5)
        except Exception as e:
            return Response(
                {'detail': f'Error obteniendo sugerencias: {e}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(sugerencias, status=status.HTTP_200_OK)

    # --------- Vista "Mis solicitudes" ---------
    @action(detail=False, methods=['get'], url_path='mias')
    def mias(self, request):
        """
        Devuelve sólo las reservas del usuario actual (aunque list()
        ya filtra por usuario estándar, esto da un endpoint explícito).
        """
        reservas = Reserva.objects.filter(usuario=request.user).order_by('-created_at')
        serializer = self.get_serializer(reservas, many=True)
        return Response(serializer.data)

    # --------- Acciones admin: autorizar / rechazar ---------
    @action(detail=True, methods=['post'], url_path='autorizar')
    def autorizar(self, request, pk=None):
        if not self._es_admin(request.user):
            return Response(
                {'detail': 'No tienes permisos para autorizar reservas.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        reserva = self.get_object()
        reserva.estado = 'AUTORIZADA'
        reserva.save()
        serializer = self.get_serializer(reserva)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='rechazar')
    def rechazar(self, request, pk=None):
        if not self._es_admin(request.user):
            return Response(
                {'detail': 'No tienes permisos para rechazar reservas.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        reserva = self.get_object()
        reserva.estado = 'RECHAZADA'
        reserva.save()
        serializer = self.get_serializer(reserva)
        return Response(serializer.data)

    # --------- Helpers ORS ---------
    def _obtener_duracion_y_estado_ors(self, destino_texto):
        """
        - Geocodifica origen (Facultad) y destino con ORS.
        - Calcula ruta en coche (driving-car) con ORS Directions.
        - Devuelve (duracion_en_horas, es_fuera_de_Chihuahua).
        """
        api_key = getattr(settings, 'ORS_API_KEY', '')
        if not api_key:
            raise ValueError('No hay ORS_API_KEY configurada.')

        origen_texto = getattr(
            settings,
            'ORS_ORIGIN_TEXT',
            'Facultad de Ingeniería, UACH, Chihuahua, México',
        )

        # 1) Geocodificar origen y destino
        o_lon, o_lat, _ = self._geocode_ors(origen_texto, api_key)
        d_lon, d_lat, dest_region = self._geocode_ors(destino_texto, api_key)

        # 2) Llamar a Directions (driving-car)
        directions_url = 'https://api.openrouteservice.org/v2/directions/driving-car'
        headers = {
            'Authorization': api_key,
            'Content-Type': 'application/json',
        }
        body = {
            'coordinates': [
                [o_lon, o_lat],
                [d_lon, d_lat],
            ]
        }

        resp = requests.post(directions_url, headers=headers, json=body, timeout=15)
        data = resp.json()

        if resp.status_code != 200:
            mensaje = ''
            if isinstance(data, dict):
                mensaje = data.get('error', {}).get('message', '')
            raise ValueError(f'Error ORS Directions ({resp.status_code}): {mensaje}')

        try:
            duration_seconds = data['routes'][0]['summary']['duration']
        except Exception:
            raise ValueError('No se pudo leer la duración desde ORS Directions.')

        duracion_horas = duration_seconds / 3600.0

        # 3) Inferir si está fuera de Chihuahua según la región devuelta por geocoder
        if dest_region:
            es_fuera = dest_region.strip().lower() != 'chihuahua'
        else:
            # Si no se puede determinar, asumimos "fuera" por seguridad
            es_fuera = True

        return duracion_horas, es_fuera

    def _geocode_ors(self, texto, api_key):
        """
        Geocodifica un texto con ORS y devuelve (lon, lat, region).
        Usa el endpoint forward geocode:
        https://api.openrouteservice.org/geocode/search?api_key=...&text=...
        """
        url = 'https://api.openrouteservice.org/geocode/search'
        params = {
            'api_key': api_key,
            'text': texto,
            'size': 1,
        }
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()

        features = data.get('features') or []
        if not features:
            raise ValueError(f"No se encontró el lugar '{texto}' en ORS Geocoder.")

        feature = features[0]
        geometry = feature.get('geometry') or {}
        coords = geometry.get('coordinates') or []
        if len(coords) < 2:
            raise ValueError('Respuesta de geocodificación sin coordenadas válidas.')

        lon, lat = float(coords[0]), float(coords[1])

        props = feature.get('properties') or {}
        region = props.get('region') or props.get('state') or props.get('county') or None

        return lon, lat, region

    def _geocode_sugerencias_ors(self, texto, max_resultados=5):
        """
        Llama al geocoder de OpenRouteService y devuelve una lista de
        sugerencias: [{ label, lat, lon, region }, ...]
        """
        api_key = getattr(settings, 'ORS_API_KEY', '')
        if not api_key:
            raise ValueError('No hay ORS_API_KEY configurada.')

        url = 'https://api.openrouteservice.org/geocode/search'
        params = {
            'api_key': api_key,
            'text': texto,
            'size': max_resultados,
        }
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()

        features = data.get('features') or []
        resultados = []

        for feature in features:
            geometry = feature.get('geometry') or {}
            coords = geometry.get('coordinates') or []
            if len(coords) < 2:
                continue

            lon, lat = float(coords[0]), float(coords[1])

            props = feature.get('properties') or {}
            label = props.get('label') or props.get('name') or texto
            region = (
                props.get('region')
                or props.get('state')
                or props.get('county')
                or None
            )

            resultados.append(
                {
                    'label': label,
                    'lat': lat,
                    'lon': lon,
                    'region': region,
                }
            )

        return resultados

    # --------- Helpers internos ---------
    def _vehiculo_disponible_en_fechas(self, vehiculo, fecha_inicio, fecha_fin):
        """
        El vehículo queda fuera de servicio 3 días naturales después de cada viaje.
        Checamos solapamiento contra reservas AUTORIZADAS.
        """
        reservas = Reserva.objects.filter(
            vehiculo=vehiculo,
            estado='AUTORIZADA',
        )

        for r in reservas:
            r_inicio = r.fecha_inicio
            r_fin = r.fecha_fin + timedelta(days=3)  # +3 días de descanso
            # Si hay intersección entre [fecha_inicio, fecha_fin] y [r_inicio, r_fin], no está disponible
            if not (fecha_fin < r_inicio or fecha_inicio > r_fin):
                return False
        return True

    def _tiene_choferes_disponibles(
        self,
        vehiculo,
        fecha_inicio,
        fecha_fin,
        duracion_horas,
        van_necesita_chofer,
    ):
        """
        - Camiones siempre requieren chofer oficial.
        - Vans solo si el usuario pide chofer UACH.
        - 2 choferes si el viaje dura más de 6 horas.
        """
        requiere_oficial = vehiculo.requiere_chofer_oficial or (
            vehiculo.tipo == 'VAN' and van_necesita_chofer
        )
        if not requiere_oficial:
            return True

        total_choferes = Chofer.objects.filter(activo=True).count()
        if total_choferes == 0:
            return False

        # Reservas que usan chofer oficial y SOLAPAN con el nuevo viaje
        reservas = Reserva.objects.filter(
            estado='AUTORIZADA',
            requiere_chofer_oficial=True,
        )

        choferes_ocupados = 0
        for r in reservas:
            r_inicio = r.fecha_inicio
            r_fin = r.fecha_fin  # chofer ocupado solo durante el viaje
            if not (fecha_fin < r_inicio or fecha_inicio > r_fin):
                if r.chofer1_id:
                    choferes_ocupados += 1
                if r.chofer2_id:
                    choferes_ocupados += 1

        choferes_disponibles = total_choferes - choferes_ocupados
        choferes_necesarios = 2 if duracion_horas > 6 else 1

        return choferes_disponibles >= choferes_necesarios

    def _parse_bool(self, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ['true', '1', 'yes', 'si', 'sí', 'on']
        return False

    def _es_admin(self, user):
        """
        Determina si un usuario es administrador a efectos del sistema
        de vehículos oficiales.
        """
        if not user.is_authenticated:
            return False

        if user.is_staff or user.is_superuser:
            return True

        perfil = getattr(user, 'perfil', None)
        if perfil and getattr(perfil, 'rol', None) == 'ADMIN':
            return True

        return False
