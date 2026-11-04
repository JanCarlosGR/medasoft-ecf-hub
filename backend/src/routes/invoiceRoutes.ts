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

// GET /api/invoices/stats - Resumen de mÃ©tricas fiscales
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
      message: 'Error al obtener estadÃ­sticas',
      error: err.message
    });
  }
});

// POST /api/invoices/validate-ncf - ValidaciÃ³n rÃ¡pida de NCF para el Frontend
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
    message: `e-NCF vÃ¡lido correspondiente a ${result.prefix}`
  });
});

// GET /api/invoices/:id - Obtener un comprobante por ID o NCF
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = InvoiceService.getById(id) || InvoiceService.getByNcf(id);

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: `Comprobante electrÃ³nico no encontrado para el identificador: ${id}`
    });
  }

  return res.json({
    success: true,
    data: invoice
  });
});

// GET /api/invoices/:id/qr - Obtener datos del CÃ³digo QR oficial DGII y cadena criptogrÃ¡fica
router.get('/:id/qr', (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = InvoiceService.getById(id) || InvoiceService.getByNcf(id);

  if (!invoice) {
    return res.status(404).json({
      success: false,
      message: `Comprobante electrÃ³nico no encontrado: ${id}`
    });
  }

  const qrData = InvoiceService.generateDgiiQrData(invoice);
  return res.json({
    success: true,
    data: qrData
  });
});

// GET /api/invoices/:id/print - Payload formateado para RepresentaciÃ³n Impresa (Ticket 80mm)
router.get('/:id/print', (req: Request, res: Response) => {
  const { id } = req.params;
  const receipt = InvoiceService.getReceiptData(id);

  if (!receipt) {
    return res.status(404).json({
      success: false,
      message: `Comprobante electrÃ³nico no encontrado para impresiÃ³n: ${id}`
    });
  }

  return res.json({
    success: true,
    data: receipt
  });
});

// POST /api/invoices - Emitir nuevo comprobante electrÃ³nico
router.post('/', (req: Request, res: Response) => {
  try {
    const dto: CreateInvoiceDTO = req.body;

    // 1. Validaciones de negocio y de formato DGII
    const validation = NcfValidator.validateInvoicePayload(dto);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Fallo de validaciÃ³n de comprobante fiscal electrÃ³nico',
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

    // 3. Procesar y certificar emisiÃ³n
    const created = InvoiceService.create(dto);

    return res.status(201).json({
      success: true,
      message: 'Comprobante fiscal electrÃ³nico emitido y certificado con Ã©xito ante DGII',
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


// POST /api/invoices/:id/credit-note - Emitir Nota de CrÃ©dito ElectrÃ³nica (E34) (Marcus - MEDA-10)
router.post('/:id/credit-note', (req: Request, res: Response) => {
  const { id } = req.params;
  const { motivo } = req.body;

  const result = InvoiceService.issueCreditNote(id, motivo || '01');
  if ('error' in result) {
    return res.status(400).json({ success: false, message: result.error });
  }

  return res.status(201).json({
    success: true,
    message: 'Nota de CrÃ©dito ElectrÃ³nica (E34) emitida y certificada ante DGII',
    data: result
  });
});

export default router;

