import { CreateInvoiceDTO, ECFType, ValidationResult } from '../types/invoice';

export class NcfValidator {
  private static readonly VALID_ECF_PREFIXES: ECFType[] = ['E31', 'E32', 'E33', 'E34', 'E41', 'E44'];
  private static readonly NCF_REGEX = /^E(31|32|33|34|41|44)\d{10}$/;
  private static readonly RNC_CEDULA_REGEX = /^(\d{9}|\d{11})$/;

  /**
   * Valida un e-NCF dominicano según las especificaciones técnicas de la DGII.
   */
  public static validateNcf(ncf: string): { valid: boolean; prefix?: ECFType; error?: string } {
    if (!ncf || typeof ncf !== 'string') {
      return { valid: false, error: 'El e-NCF es obligatorio y debe ser una cadena de texto.' };
    }

    const trimmed = ncf.trim().toUpperCase();

    if (trimmed.length !== 13) {
      return {
        valid: false,
        error: `Longitud de e-NCF inválida: tiene ${trimmed.length} caracteres, se requieren exactamente 13 caracteres (Ej: E310000000001).`
      };
    }

    if (!trimmed.startsWith('E')) {
      return {
        valid: false,
        error: `El e-NCF '${trimmed}' no cumple con el formato electrónico. Debe iniciar con la letra 'E'.`
      };
    }

    const prefix = trimmed.substring(0, 3) as ECFType;
    if (!this.VALID_ECF_PREFIXES.includes(prefix)) {
      return {
        valid: false,
        error: `Tipo de comprobante '${prefix}' desconocido. Tipos válidos: ${this.VALID_ECF_PREFIXES.join(', ')}.`
      };
    }

    if (!this.NCF_REGEX.test(trimmed)) {
      return {
        valid: false,
        error: `Estructura numérica inválida para '${trimmed}'. Debe contener 10 dígitos numéricos secuenciales tras el prefijo.`
      };
    }

    return { valid: true, prefix };
  }

  /**
   * Valida el formato numérico del RNC (9 dígitos) o Cédula (11 dígitos).
   */
  public static validateRnc(rnc: string, fieldName = 'RNC'): { valid: boolean; error?: string } {
    if (!rnc || typeof rnc !== 'string') {
      return { valid: false, error: `El campo ${fieldName} es obligatorio.` };
    }

    const clean = rnc.replace(/[-\s]/g, '');

    if (!this.RNC_CEDULA_REGEX.test(clean)) {
      return {
        valid: false,
        error: `El ${fieldName} '${rnc}' es inválido. Debe contener exactamente 9 dígitos (RNC comercial) u 11 dígitos (Cédula de Identidad).`
      };
    }

    return { valid: true };
  }

  /**
   * Valida el payload completo para la emisión de un e-CF.
   */
  public static validateInvoicePayload(dto: CreateInvoiceDTO): ValidationResult {
    const errors: string[] = [];

    const ncfCheck = this.validateNcf(dto.ncf);
    if (!ncfCheck.valid && ncfCheck.error) {
      errors.push(ncfCheck.error);
    }

    const emisorCheck = this.validateRnc(dto.emisorRnc, 'RNC del Emisor');
    if (!emisorCheck.valid && emisorCheck.error) {
      errors.push(emisorCheck.error);
    }

    const compradorCheck = this.validateRnc(dto.compradorRnc, 'RNC/Cédula del Comprador');
    if (!compradorCheck.valid && compradorCheck.error) {
      errors.push(compradorCheck.error);
    }

    if (!dto.compradorNombre || dto.compradorNombre.trim().length < 2) {
      errors.push('La Razón Social o Nombre del Comprador es obligatoria.');
    }

    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      errors.push('La factura debe incluir al menos un ítem o línea de detalle.');
    } else {
      dto.items.forEach((item, idx) => {
        if (!item.description || item.description.trim() === '') {
          errors.push(`Ítem en posición ${idx + 1}: la descripción es obligatoria.`);
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          errors.push(`Ítem en posición ${idx + 1}: la cantidad debe ser mayor a cero.`);
        }
        if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
          errors.push(`Ítem en posición ${idx + 1}: el precio unitario no puede ser negativo.`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

