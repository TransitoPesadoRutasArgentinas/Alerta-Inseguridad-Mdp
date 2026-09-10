import { useState } from 'react'
import './App.css'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const sirenaIcon = L.divIcon({ html: '<div style="font-size:28px">🚨</div>', className: '', iconSize: [30, 30], iconAnchor: [15, 15] })
function SelectorMapa({ onSeleccionar }) {
  useMapEvents({
    click(e) {
      onSeleccionar(e.latlng)
    }
  })
  return null
}

function App() {
  const seleccionarEnMapa = (p) => { setCoordenadas({lat:p.lat,lng:p.lng}); fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat='+p.lat+'&lon='+p.lng).then(r=>r.json()).then(d=>setUbicacion(d.display_name || (p.lat.toFixed(6)+', '+p.lng.toFixed(6)))).catch(()=>setUbicacion(p.lat.toFixed(6)+', '+p.lng.toFixed(6))) }

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      alert("Tu dispositivo no permite obtener la ubicación.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const { latitude, longitude } = posicion.coords
        setCoordenadas({ lat: latitude, lng: longitude })
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`)
          .then(r => r.json())
        .then(data => {
          const zona = (
            (data.display_name || '') + ' ' +
            JSON.stringify(data.address || {})
          ).toLowerCase()

          const permitido =
            zona.includes('mar del plata') ||
            zona.includes('general pueyrredón') ||
            zona.includes('general pueyrredon')

          if (!permitido) {
            setUbicacion('')
            setCoordenadas(null)
            alert('Esta aplicación solo permite reportar alertas dentro de General Pueyrredón.')
            return
          }

          setUbicacion(data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
        })
        .catch(() => {
          setUbicacion('')
          setCoordenadas(null)
          alert('No se pudo verificar la zona de la ubicación.')
        })
      },
      () => {
        alert("No se pudo obtener tu ubicación.")
      }
    )
  }

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [queOcurrio, setQueOcurrio] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [coordenadas, setCoordenadas] = useState(null)
  const [alertas, setAlertas] = useState([])

  const enviarAlerta = async () => {
    if (!queOcurrio.trim() || !ubicacion.trim()) {
      alert('Completá qué ocurrió y la ubicación.')
      return
    }

    let coordsFinales = coordenadas

    if (!coordsFinales) {
      try {
        const ubicacionBusqueda = ubicacion
  .trim()
  .replace(/\s+(?:y|e|&|\/|esq\.?|esquina)\s+/i, ' & ')
const consulta = encodeURIComponent(`${ubicacionBusqueda}, Mar del Plata, Buenos Aires, Argentina`)
        const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${consulta}`)
        let datos = await respuesta.json()

      if (!datos.length && ubicacion.toLowerCase().includes(' y ')) {
        const partes = ubicacion.split(/ y /i).map(x => x.trim())

        if (partes.length === 2) {
          const consultaCruce = encodeURIComponent(
            `${partes[0]}, ${partes[1]}, Mar del Plata, Buenos Aires, Argentina`
          )
          const respuestaCruce = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${consultaCruce}`
          )
          datos = await respuestaCruce.json()
        }
      }

      if (!datos.length) {
        alert('No pude encontrar esa ubicación en Mar del Plata.')
        return
      }

        coordsFinales = {
          lat: Number(datos[0].lat),
          lng: Number(datos[0].lon)
        }
      } catch {
        alert('No se pudo buscar la ubicación.')
        return
      }
    }

    const nuevaAlerta = {
      id: Date.now(),
      descripcion: queOcurrio,
      ubicacion: ubicacion,
      coordenadas: coordsFinales,
    }

    setAlertas([nuevaAlerta, ...alertas])
    setQueOcurrio('')
    setUbicacion('')
    setCoordenadas(null)
    setMostrarFormulario(false)
  }

  return (
    <div>
      <h1>🚨 Alerta Inseguridad MDP</h1>
      <p>Red comunitaria de seguridad para Mar del Plata</p>

      <button onClick={() => setMostrarFormulario(true)}>
        🚨 REPORTAR ALERTA
      </button>

      {mostrarFormulario && (
        <div>
          <h2>Reportar una alerta</h2>

          <input
            placeholder="¿Qué ocurrió?"
            value={queOcurrio}
            onChange={(e) => setQueOcurrio(e.target.value)}
          />

          <input
            placeholder="Ubicación"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
          />
        <button type="button" onClick={obtenerUbicacion}>📍 USAR MI UBICACIÓN</button>

          <button onClick={enviarAlerta}>ENVIAR ALERTA</button>

          <button onClick={() => setMostrarFormulario(false)}>
            CANCELAR
          </button>
        </div>
      )}

      <h2>Alertas recientes</h2>

      <MapContainer
        key={alertas[0]?.id || 'mapa-inicial'}
        center={
          alertas[0]?.coordenadas
            ? [alertas[0].coordenadas.lat, alertas[0].coordenadas.lng]
            : [-38.0055, -57.5426]
        }
        zoom={13}
        style={{
          height: '300px',
          width: '100%',
          marginBottom: '24px',
          borderRadius: '16px'
        }}
      >
        <SelectorMapa onSeleccionar={seleccionarEnMapa} />
          {coordenadas && <CircleMarker center={[coordenadas.lat, coordenadas.lng]} radius={10}><Popup>📍 Ubicación seleccionada</Popup></CircleMarker>}
          <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {alertas
          .filter((alerta) => alerta.coordenadas)
          .map((alerta) => (
          <Marker
            key={alerta.id}
            position={[alerta.coordenadas.lat, alerta.coordenadas.lng]}
            icon={sirenaIcon}
          >
              <Popup>
                <strong>{alerta.descripcion}</strong>
                <br />
                {alerta.ubicacion}
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {alertas.length === 0 ? (
        <p>Próximamente vas a poder ver las alertas de tu zona.</p>
      ) : (
        alertas.map((alerta) => (
          <div key={alerta.id}>
            <h3>🚨 {alerta.descripcion}</h3>
            <p>📍 {alerta.ubicacion}</p>
          </div>
        ))
      )}
    </div>
  )
}

export default App

