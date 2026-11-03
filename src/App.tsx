import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { supabase } from './lib/supabase'

function AjustarMapa({ data }: { data: any }) {
  const map = useMap()

  useEffect(() => {
    if (!data) return

    const bounds = L.geoJSON(data).getBounds()

    if (bounds.isValid()) {
      map.invalidateSize()
      map.fitBounds(bounds, { padding: [25, 25] })
    }
  }, [data, map])

  return null
}

const normalizarCodigoCircuito = (codigo: string) =>
  codigo.startsWith('0') ? codigo : `0${codigo}`

const formatoNumero = (valor: number) =>
  new Intl.NumberFormat('es-AR').format(valor)

const secciones = [
  {
    nombre: 'Histórico electoral',
    numero: '01',
    icono: '▤',
    descripcion: 'Elecciones, candidatos y resultados históricos del distrito.',
    color: 'electoral',
    etiqueta: 'HISTORIA POLÍTICA',
    fondo: 'Elecciones',
  },
  {
    nombre: 'Circuitos electorales',
    numero: '02',
    icono: '⌖',
    descripcion: 'Conocé los circuitos, sus límites y su distribución territorial.',
    color: 'circuitos',
    etiqueta: 'GEOGRAFÍA ELECTORAL',
    fondo: 'Territorio',
  },
  {
    nombre: 'Datos de La Matanza',
    numero: '03',
    icono: '▥',
    descripcion: 'Indicadores sociales, económicos, educativos y municipales.',
    color: 'datos',
    etiqueta: 'INFORMACIÓN DISTRITAL',
    fondo: 'Indicadores',
  },
  {
    nombre: 'Escrutinio 2027',
    numero: '04',
    icono: '✓',
    descripcion: 'Seguimiento de participación y resultados de la próxima elección.',
    color: 'escrutinio',
    etiqueta: 'PRÓXIMA ELECCIÓN',
    fondo: '2027',
  },
  {
    nombre: 'Población',
    numero: '05',
    icono: '♙',
    descripcion: 'Censos, habitantes, densidad y evolución demográfica.',
    color: 'poblacion',
    etiqueta: 'DATOS DEMOGRÁFICOS',
    fondo: 'Habitantes',
  },
  {
    nombre: 'Territorio',
    numero: '06',
    icono: '⌖',
    descripcion: 'Localidades, barrios, infraestructura y organización territorial.',
    color: 'territorio',
    etiqueta: 'MAPA DISTRITAL',
    fondo: 'Localidades',
  },
  {
    nombre: 'Noticias',
    numero: '07',
    icono: '▧',
    descripcion: 'Actualidad, novedades y acontecimientos de La Matanza.',
    color: 'noticias',
    etiqueta: 'ACTUALIDAD',
    fondo: 'Noticias',
  },
  {
    nombre: 'Estadísticas',
    numero: '08',
    icono: '▦',
    descripcion: 'Gráficos, indicadores, comparaciones y análisis de datos.',
    color: 'estadisticas',
    etiqueta: 'ANÁLISIS DE DATOS',
    fondo: 'Datos',
  },
  {
    nombre: 'Composición del Concejo Deliberante',
    numero: '09',
    icono: '⚖',
    descripcion: 'Concejales, bloques políticos, autoridades y evolución de las bancas.',
    color: 'concejo',
    etiqueta: 'REPRESENTACIÓN INSTITUCIONAL',
    fondo: 'Concejo',
  },
]

function App() {
  const [data, setData] = useState<any>(null)
  const [circuitoSeleccionado, setCircuitoSeleccionado] = useState('')
  const [circuitoFicha, setCircuitoFicha] = useState<any>(null)
  const [busquedaCircuito, setBusquedaCircuito] = useState('')

  const [eleccion, setEleccion] = useState(
    '4019ba4e-d7cc-4fc5-92c8-da65eadae26f'
  )

  const [elecciones, setElecciones] = useState<any[]>([])
  const [resultados, setResultados] = useState<any[]>([])
  const [cargandoResultados, setCargandoResultados] = useState(false)
  const [errorResultados, setErrorResultados] = useState('')
  const [errorCarga, setErrorCarga] = useState('')
  const [seccion, setSeccion] = useState('Inicio')

  const [estadoSupabase, setEstadoSupabase] = useState<
    'comprobando' | 'conectado' | 'error'
  >('comprobando')

  // CONEXIÓN CON SUPABASE
  useEffect(() => {
    const comprobarConexion = async () => {
      try {
        const { error } = await supabase
          .from('localidades')
          .select('id')
          .limit(1)

        setEstadoSupabase(error ? 'error' : 'conectado')
      } catch (error) {
        console.error('ERROR DE CONEXIÓN SUPABASE:', error)
        setEstadoSupabase('error')
      }
    }

    comprobarConexion()
  }, [])

  // CARGAR ELECCIONES
  useEffect(() => {
    const cargarElecciones = async () => {
      const { data, error } = await supabase
        .from('elections')
        .select('id, name, year, instance, election_date')
        .order('election_date', { ascending: false })

      if (error) {
        console.error('ERROR AL CARGAR ELECCIONES:', error)
        setErrorResultados(`Error al cargar elecciones: ${error.message}`)
        return
      }

      setElecciones(data || [])

      if (data?.length && !data.some((item) => item.id === eleccion)) {
        setEleccion(data[0].id)
      }
    }

    cargarElecciones()
  }, [])

  // CARGAR RESULTADOS ELECTORALES
  useEffect(() => {
    if (!eleccion) return

    let cancelado = false

    const cargarResultados = async () => {
      setCargandoResultados(true)
      setErrorResultados('')

      const { data, error } = await supabase
        .from('historical_circuit_results')
        .select(`
          id,
          votes,
          percentage,
          pending_category,
          validation_status,
          source_file,
          circuits!inner ( id, code, election_id ),
          parties!inner ( name, color )
        `)
        .eq('circuits.election_id', eleccion)

      if (cancelado) return

      if (error) {
        console.error('ERROR AL CARGAR RESULTADOS:', error)
        setErrorResultados(`Error al cargar resultados: ${error.message}`)
        setResultados([])
      } else {
        setResultados(data || [])
      }

      setCargandoResultados(false)
    }

    cargarResultados()

    return () => {
      cancelado = true
    }
  }, [eleccion])

  // CARGAR GEOJSON
  useEffect(() => {
    fetch('/circuitos-la-matanza.geojson')
      .then((respuesta) => {
        if (!respuesta.ok) {
          throw new Error('No se encontró el archivo GeoJSON')
        }

        return respuesta.json()
      })
      .then((archivo) => {
        if (!archivo.features?.length) {
          throw new Error('El archivo no contiene circuitos')
        }

        setData(archivo)
      })
      .catch((error) => setErrorCarga(error.message))
  }, [])

  // LISTADO DE CIRCUITOS
  const circuitosDisponibles = useMemo(() => {
    if (!data?.features) return []

    const circuitos = data.features
      .map((feature: any) => ({
        codigo: String(feature.properties?.circuito ?? ''),
        feature,
      }))
      .filter((item: any) => item.codigo !== '')
      .sort((a: any, b: any) =>
        a.codigo.localeCompare(b.codigo, 'es', { numeric: true })
      )

    return circuitos.filter(
      (item: any, index: number, lista: any[]) =>
        lista.findIndex((otro: any) => otro.codigo === item.codigo) === index
    )
  }, [data])

  const circuitosFiltrados = circuitosDisponibles.filter((item: any) =>
    item.codigo.toLowerCase().includes(busquedaCircuito.toLowerCase())
  )

  // RESULTADOS AGRUPADOS POR CIRCUITO
  const resultadosPorCircuito = useMemo(() => {
    const grupos: Record<string, any[]> = {}

    resultados.forEach((item) => {
      const codigo = item.circuits?.code

      if (!codigo) return

      if (!grupos[codigo]) grupos[codigo] = []

      grupos[codigo].push(item)
    })

    return grupos
  }, [resultados])

  // RESULTADOS GENERALES
  const resultadosGenerales = useMemo(() => {
    const grupos: Record<string, any> = {}

    resultados.forEach((item) => {
      const nombre = item.parties?.name || 'Sin agrupación'

      if (!grupos[nombre]) {
        grupos[nombre] = {
          name: nombre,
          color: item.parties?.color || '#64748b',
          votes: 0,
          percentage: 0,
        }
      }

      grupos[nombre].votes += Number(item.votes || 0)
    })

    const total = (Object.values(grupos) as any[]).reduce(
      (suma: number, item: any) => suma + item.votes,
      0
    )

    return (Object.values(grupos) as any[])
      .map((item: any) => ({
        ...item,
        percentage: total ? (item.votes / total) * 100 : 0,
      }))
      .sort((a: any, b: any) => b.votes - a.votes)
  }, [resultados])

  const totalGeneral = resultadosGenerales.reduce(
    (suma: number, item: any) => suma + item.votes,
    0
  )

  const ganadorGeneral: any = resultadosGenerales[0]

  const resultadosDelCircuito = circuitoSeleccionado
    ? resultadosPorCircuito[
        normalizarCodigoCircuito(circuitoSeleccionado)
      ] || []
    : []

  const resultadosCircuitoOrdenados = [...resultadosDelCircuito].sort(
    (a, b) => Number(b.votes || 0) - Number(a.votes || 0)
  )

  const ganadorCircuito = resultadosCircuitoOrdenados[0]

  const totalCircuito = resultadosCircuitoOrdenados.reduce(
    (suma, item) => suma + Number(item.votes || 0),
    0
  )

  // GANADOR POR CIRCUITO
  const ganadorPorCodigo: Record<string, any> = useMemo(() => {
    const mapa: Record<string, any> = {}

    ;(Object.entries(resultadosPorCircuito) as [string, any[]][]).forEach(
      ([codigo, items]) => {
        const ordenados = [...items].sort(
          (a, b) => Number(b.votes || 0) - Number(a.votes || 0)
        )

        const ganador = ordenados[0]

        if (ganador) {
          const total = items.reduce(
            (suma, item) => suma + Number(item.votes || 0),
            0
          )

          mapa[codigo] = {
            name: ganador.parties?.name || 'Sin agrupación',
            color: ganador.parties?.color || '#64748b',
            votes: Number(ganador.votes || 0),
            percentage: total
              ? (Number(ganador.votes || 0) / total) * 100
              : Number(ganador.percentage || 0),
          }
        }
      }
    )

    return mapa
  }, [resultadosPorCircuito])

  // ESTILO DEL MAPA HISTÓRICO
  const estiloCircuitos = (feature: any) => {
    const codigo = String(feature?.properties?.circuito ?? '')
    const seleccionado = codigo === circuitoSeleccionado
    const ganador = ganadorPorCodigo[normalizarCodigoCircuito(codigo)]
    const color = ganador?.color || '#334155'

    const intensidad = ganador
      ? Math.max(0.28, Math.min(1, ganador.percentage / 60))
      : 0.16

    return {
      color: seleccionado ? '#ffffff' : '#94a3b8',
      weight: seleccionado ? 3 : 1.1,
      fillColor: color,
      fillOpacity: ganador ? intensidad : 0.12,
    }
  }

  
  // NAVEGACIÓN
  const irASeccion = (nombre: string) => {
    setSeccion(nombre)
    setCircuitoSeleccionado('')
    setCircuitoFicha(null)
    setBusquedaCircuito('')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const seleccionarCircuitoFicha = (feature: any) => {
    setCircuitoFicha(feature)
    setCircuitoSeleccionado(
      String(feature.properties?.circuito ?? '')
    )

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // SELECTOR DE ELECCIÓN
  const selectorEleccion = (
    <select
      className="selector-eleccion"
      value={eleccion}
      onChange={(e) => {
        setEleccion(e.target.value)
        setCircuitoSeleccionado('')
      }}
    >
      {elecciones.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  )

  // PANEL DE RESULTADOS
  const panelResultados = (
    <aside className="panel-electoral">
      <div className="panel-electoral-cabecera">
        <div>
          <span className="sobretitulo">RESULTADOS ELECTORALES</span>

          <h2>
            {circuitoSeleccionado
              ? `Circuito ${circuitoSeleccionado}`
              : 'La Matanza'}
          </h2>

          <p>
            {circuitoSeleccionado
              ? 'Resultados de este circuito'
              : 'Resultado general · todos los circuitos'}
          </p>
        </div>

        {circuitoSeleccionado && (
          <button
            className="boton-secundario"
            onClick={() => setCircuitoSeleccionado('')}
          >
            Ver general
          </button>
        )}
      </div>

      {cargandoResultados ? (
        <div className="panel-mensaje">Cargando resultados...</div>
      ) : errorResultados ? (
        <div className="panel-mensaje error-texto">
          {errorResultados}
        </div>
      ) : resultados.length === 0 ? (
        <div className="panel-mensaje">
          No hay resultados disponibles para esta elección.
        </div>
      ) : (
        <>
          {circuitoSeleccionado ? (
            <>
              {ganadorCircuito && (
                <div
                  className="ganador-card"
                  style={{
                    borderLeftColor:
                      ganadorCircuito.parties?.color || '#64748b',
                  }}
                >
                  <span className="ganador-etiqueta">
                    AGRUPACIÓN GANADORA
                  </span>

                  <strong>{ganadorCircuito.parties?.name}</strong>

                  <div className="ganador-dato">
                    <b>
                      {formatoNumero(
                        Number(ganadorCircuito.votes || 0)
                      )}
                    </b>

                    <span>
                      {totalCircuito
                        ? (
                            (Number(ganadorCircuito.votes || 0) /
                              totalCircuito) *
                            100
                          ).toFixed(2)
                        : '0.00'}
                      %
                    </span>
                  </div>
                </div>
              )}

              <div className="lista-partidos">
                {resultadosCircuitoOrdenados.map((item, index) => {
                  const porcentaje = totalCircuito
                    ? (Number(item.votes || 0) / totalCircuito) * 100
                    : Number(item.percentage || 0)

                  return (
                    <div className="partido-resultado" key={item.id}>
                      <div className="partido-linea">
                        <span className="partido-nombre">
                          <i
                            style={{
                              background:
                                item.parties?.color || '#64748b',
                            }}
                          />

                          {index + 1}.{' '}
                          {item.parties?.name || 'Sin agrupación'}
                        </span>

                        <strong>{porcentaje.toFixed(2)}%</strong>
                      </div>

                      <div className="barra-fondo">
                        <div
                          className="barra-valor"
                          style={{
                            width: `${Math.min(100, porcentaje)}%`,
                            background:
                              item.parties?.color || '#64748b',
                          }}
                        />
                      </div>

                      <span className="partido-votos">
                        {formatoNumero(Number(item.votes || 0))} votos
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="total-votos">
                <span>Total de votos registrados</span>
                <strong>{formatoNumero(totalCircuito)}</strong>
              </div>
            </>
          ) : (
            <>
              {ganadorGeneral && (
                <div
                  className="ganador-card"
                  style={{ borderLeftColor: ganadorGeneral.color }}
                >
                  <span className="ganador-etiqueta">
                    PRIMERA FUERZA DISTRITAL
                  </span>

                  <strong>{ganadorGeneral.name}</strong>

                  <div className="ganador-dato">
                    <b>{formatoNumero(ganadorGeneral.votes)}</b>
                    <span>
                      {ganadorGeneral.percentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              <div className="lista-partidos">
                {resultadosGenerales.map((item: any, index: number) => (
                  <div className="partido-resultado" key={item.name}>
                    <div className="partido-linea">
                      <span className="partido-nombre">
                        <i style={{ background: item.color }} />
                        {index + 1}. {item.name}
                      </span>

                      <strong>{item.percentage.toFixed(2)}%</strong>
                    </div>

                    <div className="barra-fondo">
                      <div
                        className="barra-valor"
                        style={{
                          width: `${Math.min(100, item.percentage)}%`,
                          background: item.color,
                        }}
                      />
                    </div>

                    <span className="partido-votos">
                      {formatoNumero(item.votes)} votos
                    </span>
                  </div>
                ))}
              </div>

              <div className="total-votos">
                <span>Total de votos registrados</span>
                <strong>{formatoNumero(totalGeneral)}</strong>
              </div>

              <p className="ayuda-circuito">
                Seleccioná un circuito en el mapa para ver su resultado
                individual.
              </p>
            </>
          )}
        </>
      )}

      <div className="aviso-datos">
        <strong>Información en revisión</strong>
        <span>
          Los registros históricos cargados todavía deben ser contrastados
          y validados con sus fuentes.
        </span>
      </div>
    </aside>
  )

 // MÓDULO HISTÓRICO ELECTORAL
const bloqueMapaHistorico = (
  <section className="seccion-contenido seccion-electoral">
    <div className="seccion-cabecera electoral-cabecera">
      <div>
        <span className="sobretitulo">HISTORIA POLÍTICA</span>
        <h2>Histórico electoral</h2>
        <p>
          Resultados históricos por elección y circuito.
        </p>
      </div>

      {selectorEleccion}
    </div>

    <div className="electoral-layout">
      <div className="mapa-contenedor mapa-oscuro">

        <div className="mapa-barra mapa-barra-oscura">
          <div>
            <span className="mapa-punto" />
            <strong>La Matanza</strong>
            <span className="mapa-separador">/</span>
            <span>Buenos Aires, Argentina</span>
          </div>

          <span className="mapa-cantidad">
            {circuitosDisponibles.length} circuitos
          </span>
        </div>

        {data ? (
          <MapContainer
            center={[-34.75, -58.62]}
            zoom={10}
            scrollWheelZoom={true}
            className="mapa mapa-ampliado"
          >
            <AjustarMapa data={data} />

            {/* MAPA BASE: CALLES Y MANZANAS */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            {/* POLÍGONOS DE LOS CIRCUITOS ELECTORALES */}
            <GeoJSON
              key={`${eleccion}-${resultados.length}`}
              data={data}
              style={(feature: any) => {
                const codigo = normalizarCodigoCircuito(
                  String(feature?.properties?.circuito ?? "")
                );

                const ganador = ganadorPorCodigo[codigo];

                return {
                  color: ganador?.color || "#ffffff",
                  weight: 2,
                  opacity: 1,
                  fillColor: ganador?.color || "#3498db",
                  fillOpacity: ganador ? 0.45 : 0.20
                };
              }}
              onEachFeature={(feature: any, layer: any) => {
                const codigo = normalizarCodigoCircuito(
                  String(feature?.properties?.circuito ?? "")
                );

                layer.bindTooltip(
                  `Circuito ${codigo}`,
                  { sticky: true }
                );

                layer.on({
                  click: () => {
                    setCircuitoSeleccionado(codigo);
                  }
                });
              }}
            />
          </MapContainer>
        ) : (
          <div className="cargando">
            {errorCarga || "Cargando cartografía electoral..."}
          </div>
        )}

        <div className="mapa-pie-oscuro">
          <span>Color: agrupación ganadora</span>
          <span>Intensidad: porcentaje obtenido</span>
        </div>
      </div>

      {panelResultados}
    </div>

    <div className="leyenda-partidos">
      <strong>Referencias de agrupaciones</strong>

      {resultadosGenerales.map((item: any) => (
        <span key={item.name}>
          <i style={{ background: item.color }} />
          {item.name}
        </span>
      ))}

      {resultadosGenerales.length === 0 && (
        <span>
          Los colores aparecerán al cargar los resultados.
        </span>
      )}
    </div>
  </section>
);


  // MÓDULO CIRCUITOS ELECTORALES
  const bloqueCircuitos = (
    <section className="circuitos-dashboard">
      {!circuitoFicha ? (
        <>
          <div className="circuitos-hero">
            <div>
              <span className="sobretitulo">
                ORGANIZACIÓN TERRITORIAL
              </span>

              <h1>Circuitos electorales</h1>

              <p>
                Explorá los circuitos electorales de La Matanza.
                Seleccioná uno para consultar su información territorial.
              </p>
            </div>

            <div className="circuitos-total">
              <strong>{circuitosDisponibles.length}</strong>
              <span>Circuitos identificados</span>
            </div>
          </div>

          <div className="circuitos-buscador">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Buscar por número de circuito..."
              value={busquedaCircuito}
              onChange={(e) => setBusquedaCircuito(e.target.value)}
            />

            {busquedaCircuito && (
              <button onClick={() => setBusquedaCircuito('')}>
                Limpiar
              </button>
            )}
          </div>

          <div className="circuitos-mapa-card">
            <div className="circuitos-mapa-titulo">
              <div>
                <span className="sobretitulo">VISTA TERRITORIAL</span>
                <h2>Mapa de circuitos</h2>
                <p>
                  Hacé clic sobre un circuito para abrir su ficha.
                </p>
              </div>

              <span className="circuitos-mapa-contador">
                {circuitosDisponibles.length} circuitos
              </span>
            </div>

            {data ? (
              <MapContainer
                center={[-34.75, -58.62]}
                zoom={10}
                scrollWheelZoom
                className="mapa mapa-circuitos-general"
              >
                <AjustarMapa data={data} />

                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                />

                <GeoJSON
                  key="mapa-general-circuitos"
                  data={data}
                  style={() => ({
                    color: '#ffffff',
                    weight: 1.5,
                    fillColor: '#2686d8',
                    fillOpacity: 0.55,
                  })}
                  onEachFeature={(feature: any, layer: any) => {
                    const codigo = String(
                      feature.properties?.circuito ?? 'Sin código'
                    )

                    layer.bindTooltip(`Circuito ${codigo}`)

                    layer.on({
                      click: () =>
                        seleccionarCircuitoFicha(feature),

                      mouseover: (evento: any) => {
                        evento.target.setStyle({
                          fillColor: '#13b8a6',
                          fillOpacity: 0.9,
                          weight: 3,
                        })
                      },

                      mouseout: (evento: any) => {
                        evento.target.setStyle({
                          color: '#ffffff',
                          weight: 1.5,
                          fillColor: '#2686d8',
                          fillOpacity: 0.55,
                        })
                      },
                    })
                  }}
                />
              </MapContainer>
            ) : (
              <div className="cargando">
                {errorCarga || 'Cargando mapa de circuitos...'}
              </div>
            )}
          </div>

          <div className="circuitos-listado-titulo">
            <div>
              <span className="sobretitulo">
                DIRECTORIO TERRITORIAL
              </span>

              <h2>Todos los circuitos</h2>
            </div>

            <span>{circuitosFiltrados.length} resultados</span>
          </div>

          <div className="circuitos-grid">
            {circuitosFiltrados.map((item: any) => (
              <button
                key={item.codigo}
                className="circuito-card"
                onClick={() =>
                  seleccionarCircuitoFicha(item.feature)
                }
              >
                <span className="circuito-card-icono">⌖</span>

                <span className="circuito-card-etiqueta">
                  CIRCUITO ELECTORAL
                </span>

                <strong>{item.codigo}</strong>

                <span className="circuito-card-link">
                  Consultar información <b>↗</b>
                </span>
              </button>
            ))}
          </div>

          {circuitosFiltrados.length === 0 && (
            <div className="circuitos-vacio">
              No encontramos circuitos con ese código.
            </div>
          )}
        </>
      ) : (
        <div className="ficha-circuito">
          <button
            className="ficha-volver"
            onClick={() => {
              setCircuitoFicha(null)
              setCircuitoSeleccionado('')
            }}
          >
            ← Volver a todos los circuitos
          </button>

          <div className="ficha-hero">
            <span className="sobretitulo">FICHA TERRITORIAL</span>

            <h1>
              Circuito{' '}
              {String(circuitoFicha.properties?.circuito ?? '')}
            </h1>

            <p>
              Información territorial y electoral del circuito seleccionado.
            </p>
          </div>

          <div className="ficha-mapa-contenedor">
            <div className="ficha-seccion-titulo">
              <h2>Ubicación geográfica</h2>
              <span>Mapa del circuito seleccionado</span>
            </div>

            <MapContainer
              key={`ficha-${circuitoFicha.properties?.circuito}`}
              bounds={L.geoJSON(circuitoFicha).getBounds()}
              scrollWheelZoom
              className="mapa mapa-ficha"
            >
              <AjustarMapa data={circuitoFicha} />

              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />

              <GeoJSON
                data={circuitoFicha}
                style={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: '#168bca',
                  fillOpacity: 0.65,
                }}
              />
            </MapContainer>
          </div>

          <div className="ficha-seccion-titulo">
            <span className="sobretitulo">INFORMACIÓN DEL CIRCUITO</span>
            <h2>Datos generales</h2>
          </div>

          <div className="ficha-datos-grid">
            {[
              ['Localidades', 'Pendiente de carga'],
              ['Barrios', 'Pendiente de carga'],
              ['Electores', 'Pendiente de carga'],
              ['Establecimientos', 'Pendiente de carga'],
              ['Mesas electorales', 'Pendiente de carga'],
              ['Información territorial', 'Pendiente de carga'],
            ].map(([titulo, valor]) => (
              <div className="ficha-dato-card" key={titulo}>
                <span>{titulo}</span>
                <strong>{valor}</strong>
              </div>
            ))}
          </div>

          <div className="ficha-seccion-titulo">
            <span className="sobretitulo">HISTORIA POLÍTICA</span>
            <h2>Resultados electorales</h2>
          </div>

          <div className="ficha-historico">
            <p>
              Los resultados históricos de este circuito se encuentran
              en el módulo Histórico electoral. Próximamente incorporaremos
              aquí su consulta directa por año y categoría.
            </p>

            <button
              onClick={() => {
                setCircuitoFicha(null)
                irASeccion('Histórico electoral')
                setCircuitoSeleccionado(
                  String(circuitoFicha.properties?.circuito ?? '')
                )
              }}
            >
              Consultar histórico electoral →
            </button>
          </div>
        </div>
      )}
    </section>
  )

  const seccionActual = secciones.find(
    (item) => item.nombre === seccion
  )

  return (
    <div className="app">
      <main className="contenido">
        <header className="encabezado">
          <button
            className="marca marca-boton"
            onClick={() => irASeccion('Inicio')}
          >
            <span className="logo">OLM</span>

            <span className="marca-texto">
              <strong>OBSERVATORIO</strong>
              <span>LA MATANZA</span>
            </span>
          </button>

          <div className="encabezado-derecha">
            <span className="estado-header">
              <i className={`estado-punto ${estadoSupabase}`} />

              {estadoSupabase === 'conectado'
                ? 'Datos conectados'
                : estadoSupabase === 'comprobando'
                  ? 'Conectando...'
                  : 'Conexión pendiente'}
            </span>

            {seccion !== 'Inicio' && (
              <button
                className="boton-volver-header"
                onClick={() => irASeccion('Inicio')}
              >
                ← Inicio
              </button>
            )}
          </div>
        </header>

        {seccion === 'Inicio' ? (
          <>
            <section className="portada-hero">
              <div className="hero-contenido">
                <span className="hero-etiqueta">
                  PLATAFORMA DE INFORMACIÓN DISTRITAL
                </span>

                <h1>
                  OBSERVATORIO
                  <br />
                  <span>LA MATANZA</span>
                </h1>

                <p>
                  Datos para conocer, analizar y comprender la realidad
                  electoral, política y territorial del distrito.
                </p>

                <div className="hero-pie">
                  <span className="hero-punto" />
                  INFORMACIÓN · TERRITORIO · ANÁLISIS
                </div>
              </div>

              <div className="hero-grafico" aria-hidden="true">
                <div className="hero-circulo hero-circulo-uno" />
                <div className="hero-circulo hero-circulo-dos" />
                <div className="hero-monograma">OLM</div>
                <div className="hero-coordenadas">
                  34° 46' S · 58° 37' O
                </div>
              </div>
            </section>

            <section className="portada-intro">
              <div>
                <span className="sobretitulo">
                  EXPLORAR EL OBSERVATORIO
                </span>

                <h2>Un distrito. Múltiples dimensiones.</h2>

                <p>
                  Seleccioná un área para acceder a su información y
                  herramientas de consulta.
                </p>
              </div>

              <div className="conexion-resumen">
                <i className={`estado-punto ${estadoSupabase}`} />

                {estadoSupabase === 'conectado'
                  ? 'Conexión de datos activa'
                  : estadoSupabase === 'comprobando'
                    ? 'Verificando conexión'
                    : 'Conexión no disponible'}
              </div>
            </section>

            <section className="tarjetas-grid">
              {secciones.map((item) => (
                <button
                  key={item.numero}
                  className={`tarjeta-modulo tarjeta-${item.color}`}
                  onClick={() => irASeccion(item.nombre)}
                >
                  <span className="tarjeta-numero">
                    {item.numero}
                  </span>

                  <span className="tarjeta-icono">
                    {item.icono}
                  </span>

                  <span className="tarjeta-etiqueta">
                    {item.etiqueta}
                  </span>

                  <span className="tarjeta-titulo">
                    {item.nombre}
                  </span>

                  <span className="tarjeta-descripcion">
                    {item.descripcion}
                  </span>

                  <span className="tarjeta-fondo">
                    {item.fondo}
                  </span>

                  <span className="tarjeta-acceso">
                    Explorar sección <b>↗</b>
                  </span>
                </button>
              ))}
            </section>

            <section className="portada-pie">
              <div>
                <span className="sobretitulo">
                  OBSERVATORIO LA MATANZA
                </span>

                <h2>Conocer para comprender.</h2>
              </div>

              <div className="portada-pie-sigla">OLM</div>
            </section>
          </>
        ) : seccion === 'Histórico electoral' ? (
          bloqueMapaHistorico
        ) : seccion === 'Circuitos electorales' ? (
          bloqueCircuitos
        ) : (
          <section
            className={`pagina-modulo modulo-${seccionActual?.color || ''}`}
          >
            <div className="modulo-banner">
              <span className="modulo-numero">
                {seccionActual?.numero}
              </span>

              <span className="modulo-icono">
                {seccionActual?.icono}
              </span>

              <span className="modulo-etiqueta">
                {seccionActual?.etiqueta}
              </span>

              <h1>{seccion}</h1>

              <p>{seccionActual?.descripcion}</p>
            </div>

            <div className="modulo-contenido">
              <div className="modulo-en-construccion">
                <span className="construccion-icono">✦</span>

                <span className="sobretitulo">
                  ÁREA EN DESARROLLO
                </span>

                <h2>Estamos preparando esta sección.</h2>

                <p>
                  Próximamente vas a encontrar aquí información,
                  herramientas de consulta y recursos del Observatorio
                  La Matanza.
                </p>

                <button
                  className="volver-inicio"
                  onClick={() => irASeccion('Inicio')}
                >
                  Volver al panel principal
                </button>
              </div>
            </div>
          </section>
        )}

        <footer className="footer">
          <span>© 2026 Observatorio La Matanza</span>
          <span>Datos · Territorio · Información</span>
        </footer>
      </main>
    </div>
  )
}

export default App
