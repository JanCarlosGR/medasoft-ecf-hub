export type ECFType = 'E31' | 'E32' | 'E33' | 'E34' | 'E41' | 'E44';

export type ECFStatus = 'PENDING' | 'ACCEPTED' | 'ACCEPTED_WITH_OBSERVATIONS' | 'REJECTED';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isTaxable: boolean;
  total: number;
}

export interface CreateInvoiceDTO {
  ncf: string;
  emisorRnc: string;
  compradorRnc: string;
  compradorNombre: string;
  fechaEmision: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    isTaxable?: boolean;
  }>;
}

export interface Invoice {
  id: string;
  ncf: string;
  ecfType: ECFType;
  emisorRnc: string;
  compradorRnc: string;
  compradorNombre: string;
  fechaEmision: string;
  items: InvoiceItem[];
  subtotal: number;
  itbisTotal: number;
  montoTotal: number;
  trackId: string;
  status: ECFStatus;
  dgiiResponseCode: string;
  dgiiResponseMessage: string;
  createdAt: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DgiiQrPayload {
  rncEmisor: string;
  rncComprador: string;
  encf: string;
  montoTotal: string;
  itbis: string;
  fechaEmision: string;
  codigoSeguridad: string;
  verificationUrl: string;
  qrContent: string;
}

export interface Receipt80mmData {
  company: {
    name: string;
    rnc: string;
    tradeName: string;
    address: string;
    phone: string;
    website: string;
  };
  invoice: {
    id: string;
    ncf: string;
    ecfTypeName: string;
    fechaEmision: string;
    fechaVencimientoSecuencia: string;
    trackId: string;
    codigoSeguridad: string;
    status: string;
  };
  buyer: {
    rnc: string;
    nombre: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    isTaxable: boolean;
    total: number;
  }>;
  financials: {
    subtotalGravado: number;
    subtotalExento: number;
    itbis18: number;
    montoTotal: number;
    currency: string;
  };
  qr: DgiiQrPayload;
  footer: {
    legalNotice: string;
    dgiiNorm: string;
    printNotice: string;
  };
}


