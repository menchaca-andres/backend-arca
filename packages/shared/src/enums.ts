export enum RolUsuario {
  ADMIN = 'ADMIN',
  RRHH = 'RRHH',
  DIRECCION = 'DIRECCION',
  FUNCIONARIO = 'FUNCIONARIO',
}

export enum EstadoFuncionario {
  EN_PRUEBA = 'EN_PRUEBA',
  RATIFICADO = 'RATIFICADO',
  BAJA = 'BAJA',
}

export enum MotivoBaja {
  RENUNCIA = 'RENUNCIA',
  DESPIDO = 'DESPIDO',
  FIN_CONTRATO = 'FIN_CONTRATO',
  NO_RATIFICADO = 'NO_RATIFICADO',
  OTRO = 'OTRO',
}

export enum MotivoAsignacion {
  INGRESO = 'INGRESO',
  ASCENSO = 'ASCENSO',
  TRASLADO = 'TRASLADO',
  INCREMENTO = 'INCREMENTO',
  CORRECCION = 'CORRECCION',
}

export enum EstadoSolicitud {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
}

export enum TipoContrato {
  INDEFINIDO = 'INDEFINIDO',
  PLAZO_FIJO = 'PLAZO_FIJO',
}

export enum EstadoContrato {
  VIGENTE = 'VIGENTE',
  REEMPLAZADO = 'REEMPLAZADO',
}

export enum TipoConcepto {
  HABER = 'HABER',
  DESCUENTO = 'DESCUENTO',
}

export enum FormaCalculo {
  SISTEMA = 'SISTEMA',
  MONTO_FIJO = 'MONTO_FIJO',
  PORCENTAJE = 'PORCENTAJE',
}

export enum BaseCalculo {
  HABER_BASICO = 'HABER_BASICO',
  TOTAL_GANADO = 'TOTAL_GANADO',
}

export enum EstadoPeriodo {
  BORRADOR = 'BORRADOR',
  EMITIDO = 'EMITIDO',
}

export enum EstadoBoleta {
  BORRADOR = 'BORRADOR',
  EMITIDA = 'EMITIDA',
  RECTIFICADA = 'RECTIFICADA',
}
