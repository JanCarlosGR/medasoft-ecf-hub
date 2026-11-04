import { Router, Request, Response } from 'express';
import { InvoiceService } from '../services/invoiceService';
import { NcfValidator } from '../services/ncfValidator';
import { CreateInvoiceDTO } from '../types/invoice';

const router = Router();

// GET /api/invoices - Listar todos los e-CF
router.get('/', (req: Request, res: Response) => {
  try {
    const invoices = InvoiceService.getAll();
    res.json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Error interno al consultar e-CFs',
      error: err.message
    });
  }
});

// GET /api/invoices/stats - Resumen de métricas fiscales
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = InvoiceService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: err.message
    });
  }
});

// POST /api/invoices/validate-ncf - Validación rápida de NCF para el Frontend
router.post('/validate-ncf', (req: Request, res: Response) => {
  const { ncf } = req.body;
  if (!ncf) {
    return res.status(400).json({
      valid: false,
      message: 'El campo ncf es requerido.'
    });
  }

  const result = NcfValidator.validateNcf(ncf);
  if (!result.valid) {
    return res.status(400).json({
      valid: false,
      error: result.error
    });
  }

  return res.json({
    valid: true,
    ncf: ncf.toUpperCase(),
    type: result.prefix,
    message: `e-NCF válido correspondiente a ${result.prefix}`
  });
});

// GET /api/invoices/:id - Obtener un comprobante por ID o NCF
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = InvoiceService.getById(id) || InvoiceService.getByNcf(id);

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: `Comprobante electrónico no encontrado para el identificador: ${id}`
    });
  }

  return res.json({
    success: true,
    data: invoice
  });
});

// GET /api/invoices/:id/qr - Obtener datos del Código QR oficial DGII y cadena criptográfica
router.get('/:id/qr', (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = InvoiceService.getById(id) || InvoiceService.getByNcf(id);

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: `Comprobante electrónico no encontrado: ${id}`
    });
  }

  const qrData = InvoiceService.generateDgiiQrData(invoice);
  return res.json({
    success: true,
    data: qrData
  });
});

// GET /api/invoices/:id/print - Payload formateado para Representación Impresa (Ticket 80mm)
router.get('/:id/print', (req: Request, res: Response) => {
  const { id } = req.params;
  const receipt = InvoiceService.getReceiptData(id);

  if (!receipt) {
    return res.status(404).json({
      success: false,
      message: `Comprobante electrónico no encontrado para impresión: ${id}`
    });
  }

  return res.json({
    success: true,
    data: receipt
  });
});

// POST /api/invoices - Emitir nuevo comprobante electrónico
router.post('/', (req: Request, res: Response) => {
  try {
    const dto: CreateInvoiceDTO = req.body;

    // 1. Validaciones de negocio y de formato DGII
    const validation = NcfValidator.validateInvoicePayload(dto);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Fallo de validación de comprobante fiscal electrónico',
        errors: validation.errors
      });
    }

    // 2. Verificar duplicidad de NCF
    const existing = InvoiceService.getByNcf(dto.ncf);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `El e-NCF ${dto.ncf.toUpperCase()} ya fue emitido previamente con TrackID ${existing.trackId}.`
      });
    }

    // 3. Procesar y certificar emisión
    const created = InvoiceService.create(dto);

    return res.status(201).json({
      success: true,
      message: 'Comprobante fiscal electrónico emitido y certificado con éxito ante DGII',
      data: created
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor al emitir comprobante',
      error: err.message
    });
  }
});

export default router;

