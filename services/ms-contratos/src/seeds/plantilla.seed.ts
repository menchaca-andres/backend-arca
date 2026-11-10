import { TipoContrato } from '@arca/shared';
import { Plantilla } from '../entities/plantilla.entity';
import { PlantillaVersion } from '../entities/plantilla-version.entity';
import { AppDataSource } from '../data-source';
import { extraerVariables } from '../domain/template-variables';

export const CONTENIDO_CONTRATO_INDEFINIDO_SEMILLA = `CONTRATO INDIVIDUAL DE TRABAJO A PLAZO INDEFINIDO

Conste por el presente documento privado sobre Contrato Individual de Trabajo a Plazo Indefinido, que celebran por una parte {{empresa.razon_social}}, en adelante denominada EL EMPLEADOR; y por otra parte el/la ciudadano(a) {{funcionario.nombre_completo}}, con Cédula de Identidad {{funcionario.ci}}, que en lo sucesivo se denominará EL/LA TRABAJADOR(A), bajo las siguientes cláusulas y estipulaciones:

PRIMERA (OBJETO Y CARGO).- EL EMPLEADOR contrata los servicios de EL/LA TRABAJADOR(A) para que desempeñe las funciones inherentes al cargo de {{asignacion.cargo}}, prestando sus servicios en el área de {{asignacion.area}}.

SEGUNDA (FECHA DE INGRESO Y PERÍODO DE PRUEBA).- La relación laboral inicia a partir del {{fechaLarga funcionario.fecha_ingreso}}. En virtud a la legislación laboral aplicable, las partes convienen un período de prueba de {{funcionario.dias_prueba}} días. Cumplido satisfactoriamente dicho lapso sin mediar comunicación en contrario, el presente contrato adquiere carácter definitivo e indefinido.

TERCERA (REMUNERACIÓN).- Como contraprestación por sus labores, EL/LA TRABAJADOR(A) percibirá un salario básico mensual de {{montoBs asignacion.remuneracion}} ({{asignacion.remuneracion_literal}}), sujeto a las retenciones legales y de seguridad social.

CUARTA (CONFORMIDAD).- Ambas partes manifiestan su plena conformidad con todas y cada una de las cláusulas del presente contrato, firmando al pie en fecha {{fecha_emision}}.`;

export async function sembrarPlantillaIndefinida(): Promise<Plantilla> {
  const plantillaRepo = AppDataSource.getRepository(Plantilla);
  const versionRepo = AppDataSource.getRepository(PlantillaVersion);

  let plantilla = await plantillaRepo.findOneBy({ codigo: 'CTR-INDEF' });
  if (!plantilla) {
    plantilla = plantillaRepo.create({
      codigo: 'CTR-INDEF',
      nombre: 'Contrato de trabajo a plazo indefinido',
      tipo: TipoContrato.INDEFINIDO,
      activo: true,
    });
    plantilla = await plantillaRepo.save(plantilla);

    const version = versionRepo.create({
      plantillaId: plantilla.id,
      version: 1,
      contenido: CONTENIDO_CONTRATO_INDEFINIDO_SEMILLA,
      variables: extraerVariables(CONTENIDO_CONTRATO_INDEFINIDO_SEMILLA),
      activa: true,
      creadoPor: '00000000-0000-0000-0000-000000000000',
    });
    await versionRepo.save(version);
  }

  return plantilla;
}

