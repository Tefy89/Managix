# Fase 3 — Cálculos base de la Ficha de Costos

## Decisión sobre el costo por minuto MOD

No existe un archivo Excel dentro del repositorio para reproducir una celda concreta. La fórmula literal se derivó de la duplicación descrita en el requerimiento: el costo mensual ya se multiplica por `numero_operarias` y la misma cantidad se volvería a multiplicar en el numerador del costo/minuto.

Para `S = total_salario_mensual` y una capacidad de `7.680` minutos productivos mensuales por operaria:

| Operarias | Variante literal descrita | Fórmula coherente implementada | Diferencia |
| --- | --- | --- | --- |
| 1 | `S / 7680` | `S / 7680` | `0` |
| 2 | `2S / 7680` | `S / 7680` | `S / 7680` |
| 3 | `3S / 7680` | `S / 7680` | `2S / 7680` |

La implementación usa la fórmula coherente:

```
costo_mensual_MOD = total_salario_mensual * numero_operarias
minutos_productivos_mes = numero_operarias * 4 * 5 * 480 * 0.80
costo_minuto_MOD = costo_mensual_MOD / minutos_productivos_mes
```

Así el costo por minuto no aumenta artificialmente al incorporar capacidad adicional. El SBU no tiene valor predeterminado: se captura explícitamente en cada versión y queda guardado como snapshot.

## Redondeo

El Backend calcula con precisión interna de seis decimales y persiste los resultados en `NUMERIC`. Las horas se conservan a cuatro decimales. La interfaz presenta importes con dos decimales donde corresponde, sin usar los valores mostrados como fuente de cálculo.

## Persistencia

- `version_costeo_calculo_base`: entradas, parámetros fijos y resultados de los cuadros 1–4, además de sus totales de los cuadros 5–6.
- `version_costeo_calculo_actividad`: las nueve actividades, horas editables y tarifa aplicada como snapshot.

Ambas estructuras se inicializan por versión. En una nueva versión se copian íntegramente los valores y actividades de la versión finalizada origen.
