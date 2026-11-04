import { CreateInvoiceDTO, ECFType, ValidationResult } from '../types/invoice';

export class NcfValidator {
  private static readonly VALID_ECF_PREFIXES: ECFType[] = ['E31', 'E32', 'E33', 'E34', 'E41', 'E44'];
  private static readonly NCF_REGEX = /^E(31|32|33|34|41|44)\d{10}$/;
  private static readonly RNC_CEDULA_REGEX = /^(\d{9}|\d{11})$/;

  /**
   * Valida un e-NCF dominicano segÃºn las especificaciones tÃ©cnicas de la DGII.
   */
  public static validateNcf(ncf: string): { valid: boolean; prefix?: ECFType; error?: string } {
    if (!ncf || typeof ncf !== 'string') {
      return { valid: false, error: 'El e-NCF es obligatorio y debe ser una cadena de texto.' };
    }

    const trimmed = ncf.trim().toUpperCase();

    if (trimmed.length !== 13) {
      return {
        valid: false,
        error: `Longitud de e-NCF invÃ¡lida: tiene ${trimmed.length} caracteres, se requieren exactamente 13 caracteres (Ej: E310000000001).`
      };
    }

    if (!trimmed.startsWith('E')) {
      return {
        valid: false,
        error: `El e-NCF '${trimmed}' no cumple con el formato electrÃ³nico. Debe iniciar con la letra 'E'.`
      };
    }

    const prefix = trimmed.substring(0, 3) as ECFType;
    if (!this.VALID_ECF_PREFIXES.includes(prefix)) {
      return {
        valid: false,
        error: `Tipo de comprobante '${prefix}' desconocido. Tipos vÃ¡lidos: ${this.VALID_ECF_PREFIXES.join(', ')}.`
      };
    }

    if (!this.NCF_REGEX.test(trimmed)) {
      return {
        valid: false,
        error: `Estructura numÃ©rica invÃ¡lida para '${trimmed}'. Debe contener 10 dÃ­gitos numÃ©ricos secuenciales tras el prefijo.`
      };
    }

    return { valid: true, prefix };
  }

  /**
   * Valida el formato numÃ©rico del RNC (9 dÃ­gitos) o CÃ©dula (11 dÃ­gitos).
   */
  public static validateRnc(rnc: string, fieldName = 'RNC'): { valid: boolean; error?: string } {
    if (!rnc || typeof rnc !== 'string') {
      return { valid: false, error: `El campo ${fieldName} es obligatorio.` };
    }

    const clean = rnc.replace(/[-\s]/g, '');

    if (!this.RNC_CEDULA_REGEX.test(clean)) {
      return {
        valid: false,
        error: `El ${fieldName} '${rnc}' es invÃ¡lido. Debe contener exactamente 9 dÃ­gitos (RNC comercial) u 11 dÃ­gitos (CÃ©dula de Identidad).`
      };
    }

    return { valid: true };
  }

  /**
   * Valida el payload completo para la emisiÃ³n de un e-CF.
   */
  
  /**
   * Algoritmo Oficial DGII MÃ³dulo 11 para validaciÃ³n de RNC (9 dÃ­gitos)
   */
  public static validateRncModulo11(rnc: string): boolean {
    const clean = rnc.replace(/[-\s]/g, '');
    if (clean.length !== 9 || !/^\d{9}$/.test(clean)) return false;

    const weights = [7, 9, 8, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(clean[i], 10) * weights[i];
    }
    const remainder = sum % 11;
    let checkDigit = 0;
    if (remainder === 0) checkDigit = 2;
    else if (remainder === 1) checkDigit = 1;
    else checkDigit = 11 - remainder;

    return checkDigit === parseInt(clean[8], 10);
  }

  /**
   * Algoritmo Oficial Junta Central Electoral (JCE) MÃ³dulo 10 para CÃ©dula (11 dÃ­gitos)
   */
  public static validateCedulaModulo10(cedula: string): boolean {
    const clean = cedula.replace(/[-\s]/g, '');
    if (clean.length !== 11 || !/^\d{11}$/.test(clean)) return false;

    const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      let prod = parseInt(clean[i], 10) * weights[i];
      if (prod >= 10) prod = Math.floor(prod / 10) + (prod % 10);
      sum += prod;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(clean[10], 10);
  }

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

    const compradorCheck = this.validateRnc(dto.compradorRnc, 'RNC/CÃ©dula del Comprador');
    if (!compradorCheck.valid && compradorCheck.error) {
      errors.push(compradorCheck.error);
    }

    if (!dto.compradorNombre || dto.compradorNombre.trim().length < 2) {
      errors.push('La RazÃ³n Social o Nombre del Comprador es obligatoria.');
    }

    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      errors.push('La factura debe incluir al menos un Ã­tem o lÃ­nea de detalle.');
    } else {
      dto.items.forEach((item, idx) => {
        if (!item.description || item.description.trim() === '') {
          errors.push(`Ãtem en posiciÃ³n ${idx + 1}: la descripciÃ³n es obligatoria.`);
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          errors.push(`Ãtem en posiciÃ³n ${idx + 1}: la cantidad debe ser mayor a cero.`);
        }
        if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
          errors.push(`Ãtem en posiciÃ³n ${idx + 1}: el precio unitario no puede ser negativo.`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

