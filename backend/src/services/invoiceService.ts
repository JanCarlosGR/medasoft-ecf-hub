import { CreateInvoiceDTO, ECFType, Invoice, InvoiceItem, Receipt80mmData, DgiiQrPayload } from '../types/invoice';
import { NcfValidator } from './ncfValidator';

export class InvoiceService {
  private static invoices: Invoice[] = [];

  static {
    // Inicializar con comprobantes e-CF de prueba válidos
    this.seedInitialData();
  }

  private static seedInitialData(): void {
    const seed1: Invoice = {
      id: 'ecf-seed-001',
      ncf: 'E310000000001',
      ecfType: 'E31',
      emisorRnc: '131456789',
      compradorRnc: '101894231',
      compradorNombre: 'SERVICIOS TECNOLÓGICOS DEL CARIBE SRL',
      fechaEmision: new Date(Date.now() - 3600000 * 24).toISOString().split('T')[0],
      items: [
        {
          id: 'item-1',
          description: 'Suscripción Anual Plataforma Medasoft Cloud ERP',
          quantity: 1,
          unitPrice: 45000,
          isTaxable: true,
          total: 45000
        },
        {
          id: 'item-2',
          description: 'Servicio de Consultoría e Implementación DGII e-CF',
          quantity: 10,
          unitPrice: 3500,
          isTaxable: true,
          total: 35000
        }
      ],
      subtotal: 80000,
      itbisTotal: 14400,
      montoTotal: 94400,
      trackId: '64a9fb21-72bd-4813-8ae7-b089e13a9482',
      status: 'ACCEPTED',
      dgiiResponseCode: '00',
      dgiiResponseMessage: 'Comprobante recibido y validado satisfactoriamente por el Servicio Web e-CF.',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
    };

    const seed2: Invoice = {
      id: 'ecf-seed-002',
      ncf: 'E320000000001',
      ecfType: 'E32',
      emisorRnc: '131456789',
      compradorRnc: '40219827361',
      compradorNombre: 'JUAN PÉREZ ROSARIO (CONSUMIDOR FINAL)',
      fechaEmision: new Date().toISOString().split('T')[0],
      items: [
        {
          id: 'item-1',
          description: 'Mantenimiento Preventivo Servidores Locales',
          quantity: 1,
          unitPrice: 12500,
          isTaxable: true,
          total: 12500
        }
      ],
      subtotal: 12500,
      itbisTotal: 2250,
      montoTotal: 14750,
      trackId: '82de61c9-3a11-477c-a49e-cc19e594d209',
      status: 'ACCEPTED',
      dgiiResponseCode: '00',
      dgiiResponseMessage: 'Comprobante de consumo recibido y validado satisfactoriamente.',
      createdAt: new Date().toISOString()
    };

    this.invoices.push(seed1, seed2);
  }

  public static getAll(): Invoice[] {
    return [...this.invoices].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public static getById(id: string): Invoice | undefined {
    return this.invoices.find(inv => inv.id === id);
  }

  public static getByNcf(ncf: string): Invoice | undefined {
    return this.invoices.find(inv => inv.ncf.toUpperCase() === ncf.toUpperCase().trim());
  }

  public static generateDgiiQrData(invoice: Invoice): DgiiQrPayload {
    const rncEmisor = invoice.emisorRnc.replace(/[-\s]/g, '');
    const rncComprador = invoice.compradorRnc.replace(/[-\s]/g, '');
    const encf = invoice.ncf.trim().toUpperCase();
    const montoTotal = invoice.montoTotal.toFixed(2);
    const itbis = invoice.itbisTotal.toFixed(2);
    const fechaEmision = invoice.fechaEmision;
    const codigoSeguridad = (invoice.trackId.replace(/-/g, '').slice(0, 6)).toUpperCase();

    const params = new URLSearchParams({
      rncEmisor,
      rncComprador,
      encf,
      montoTotal,
      itbis,
      fechaEmision,
      codigoSeguridad
    });

    const verificationUrl = `https://ecf.dgii.gov.do/consultas/ecf?${params.toString()}`;

    return {
      rncEmisor,
      rncComprador,
      encf,
      montoTotal,
      itbis,
      fechaEmision,
      codigoSeguridad,
      verificationUrl,
      qrContent: verificationUrl
    };
  }

  public static getReceiptData(id: string): Receipt80mmData | undefined {
    const invoice = this.getById(id) || this.getByNcf(id);
    if (!invoice) return undefined;

    const qr = this.generateDgiiQrData(invoice);

    const typeLabels: Record<string, string> = {
      E31: 'FACTURA DE CRÉDITO FISCAL ELECTRÓNICA',
      E32: 'FACTURA DE CONSUMO ELECTRÓNICA',
      E33: 'NOTA DE DÉBITO ELECTRÓNICA',
      E34: 'NOTA DE CRÉDITO ELECTRÓNICA',
      E41: 'COMPROBANTE DE COMPRAS ELECTRÓNICO',
      E44: 'REGÍMENES ESPECIALES ELECTRÓNICO'
    };

    let subtotalGravado = 0;
    let subtotalExento = 0;

    invoice.items.forEach(item => {
      if (item.isTaxable) {
        subtotalGravado += item.total;
      } else {
        subtotalExento += item.total;
      }
    });

    return {
      company: {
        name: 'MEDASOFT DOMINICANA SRL',
        tradeName: 'MEDASOFT CLOUD ERP & e-CF HUB',
        rnc: invoice.emisorRnc,
        address: 'Av. Winston Churchill #1099, Torre Citi, Piantini, Sto Dgo',
        phone: '(809) 555-0199 / (809) 555-0200',
        website: 'https://medasoft.do'
      },
      invoice: {
        id: invoice.id,
        ncf: invoice.ncf,
        ecfTypeName: typeLabels[invoice.ecfType] || 'COMPROBANTE FISCAL ELECTRÓNICO',
        fechaEmision: invoice.fechaEmision,
        fechaVencimientoSecuencia: '31/12/2027',
        trackId: invoice.trackId,
        codigoSeguridad: qr.codigoSeguridad,
        status: invoice.status
      },
      buyer: {
        rnc: invoice.compradorRnc,
        nombre: invoice.compradorNombre
      },
      items: invoice.items.map(it => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        isTaxable: it.isTaxable,
        total: it.total
      })),
      financials: {
        subtotalGravado: Number(subtotalGravado.toFixed(2)),
        subtotalExento: Number(subtotalExento.toFixed(2)),
        itbis18: invoice.itbisTotal,
        montoTotal: invoice.montoTotal,
        currency: 'DOP (RD$)'
      },
      qr,
      footer: {
        legalNotice: 'Representación Impresa oficial del Comprobante Fiscal Electrónico (e-CF) conforme a la Ley No. 32-23 de Facturación Electrónica de la República Dominicana.',
        dgiiNorm: 'Norma General 06-2018 DGII - Autorizado para emisión electrónica.',
        printNotice: 'Escanee el código QR con cualquier dispositivo o ingrese a https://ecf.dgii.gov.do para verificar autenticidad.'
      }
    };
  }

  public static create(dto: CreateInvoiceDTO): Invoice {
    // 1. Extraer tipo de e-CF
    const ncfValidation = NcfValidator.validateNcf(dto.ncf);
    const ecfType: ECFType = ncfValidation.prefix || 'E31';

    // 2. Calcular montos
    let subtotal = 0;
    let itbisTotal = 0;

    const items: InvoiceItem[] = dto.items.map((item, idx) => {
      const isTaxable = item.isTaxable !== false; // Gravado por defecto (18%)
      const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
      subtotal += lineTotal;

      if (isTaxable) {
        itbisTotal += Number((lineTotal * 0.18).toFixed(2));
      }

      return {
        id: `line-${idx + 1}-${Date.now().toString().slice(-4)}`,
        description: item.description.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        isTaxable,
        total: lineTotal
      };
    });

    subtotal = Number(subtotal.toFixed(2));
    itbisTotal = Number(itbisTotal.toFixed(2));
    const montoTotal = Number((subtotal + itbisTotal).toFixed(2));

    // 3. Generar TrackID único simulando WebService DGII
    const trackId = this.generateTrackId();

    const invoice: Invoice = {
      id: `ecf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ncf: dto.ncf.trim().toUpperCase(),
      ecfType,
      emisorRnc: dto.emisorRnc.replace(/[-\s]/g, ''),
      compradorRnc: dto.compradorRnc.replace(/[-\s]/g, ''),
      compradorNombre: dto.compradorNombre.trim().toUpperCase(),
      fechaEmision: dto.fechaEmision || new Date().toISOString().split('T')[0],
      items,
      subtotal,
      itbisTotal,
      montoTotal,
      trackId,
      status: 'ACCEPTED',
      dgiiResponseCode: '00',
      dgiiResponseMessage: 'Comprobante recibido, certificado y registrado con éxito en ambiente de producción.',
      createdAt: new Date().toISOString()
    };

    this.invoices.unshift(invoice);
    return invoice;
  }

  public static getStats() {
    const totalEmitted = this.invoices.length;
    const totalMonto = this.invoices.reduce((acc, curr) => acc + curr.montoTotal, 0);
    const totalItbis = this.invoices.reduce((acc, curr) => acc + curr.itbisTotal, 0);
    const totalSubtotal = this.invoices.reduce((acc, curr) => acc + curr.subtotal, 0);

    const byType: Record<string, number> = {};
    this.invoices.forEach(inv => {
      byType[inv.ecfType] = (byType[inv.ecfType] || 0) + 1;
    });

    return {
      totalEmitted,
      totalSubtotal: Number(totalSubtotal.toFixed(2)),
      totalItbis: Number(totalItbis.toFixed(2)),
      totalMonto: Number(totalMonto.toFixed(2)),
      acceptedCount: this.invoices.filter(i => i.status === 'ACCEPTED').length,
      byType
    };
  }

  private static generateTrackId(): string {
    const hex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${hex()}${hex()}-${hex()}-4${hex().substr(0, 3)}-a${hex().substr(0, 3)}-${hex()}${hex()}${hex()}`;
  }
}

