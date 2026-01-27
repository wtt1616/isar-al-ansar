export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'multiselect'
  | 'date'
  | 'time'
  | 'file'
  | 'heading'
  | 'paragraph';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    fileTypes?: string[];
    maxFileSize?: number;
  };
  order: number;
}

export interface FieldTypeConfig {
  type: FieldType;
  label: string;
  icon: string;
  description: string;
  hasOptions: boolean;
  defaultPlaceholder?: string;
}

export const FIELD_TYPES: FieldTypeConfig[] = [
  {
    type: 'heading',
    label: 'Tajuk Seksyen',
    icon: 'bi-type-h1',
    description: 'Tajuk atau heading untuk bahagian borang',
    hasOptions: false,
    defaultPlaceholder: 'Tajuk Seksyen'
  },
  {
    type: 'paragraph',
    label: 'Keterangan',
    icon: 'bi-text-left',
    description: 'Teks penerangan atau arahan kepada pengguna',
    hasOptions: false,
    defaultPlaceholder: 'Masukkan keterangan atau arahan di sini...'
  },
  {
    type: 'text',
    label: 'Teks',
    icon: 'bi-fonts',
    description: 'Input teks satu baris',
    hasOptions: false,
    defaultPlaceholder: 'Masukkan teks...'
  },
  {
    type: 'textarea',
    label: 'Teks Panjang',
    icon: 'bi-text-paragraph',
    description: 'Input teks berbilang baris',
    hasOptions: false,
    defaultPlaceholder: 'Masukkan teks...'
  },
  {
    type: 'number',
    label: 'Nombor',
    icon: 'bi-123',
    description: 'Input nombor sahaja',
    hasOptions: false,
    defaultPlaceholder: '0'
  },
  {
    type: 'email',
    label: 'Email',
    icon: 'bi-envelope',
    description: 'Alamat email dengan validasi',
    hasOptions: false,
    defaultPlaceholder: 'contoh@email.com'
  },
  {
    type: 'phone',
    label: 'Telefon',
    icon: 'bi-telephone',
    description: 'Nombor telefon',
    hasOptions: false,
    defaultPlaceholder: '012-3456789'
  },
  {
    type: 'dropdown',
    label: 'Dropdown',
    icon: 'bi-chevron-down',
    description: 'Pilihan tunggal dari senarai',
    hasOptions: true
  },
  {
    type: 'radio',
    label: 'Radio',
    icon: 'bi-ui-radios',
    description: 'Pilihan tunggal dengan butang radio',
    hasOptions: true
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    icon: 'bi-ui-checks',
    description: 'Pilihan berbilang dengan checkbox',
    hasOptions: true
  },
  {
    type: 'multiselect',
    label: 'Multi-Pilihan',
    icon: 'bi-ui-checks-grid',
    description: 'Pilihan berbilang dari dropdown',
    hasOptions: true
  },
  {
    type: 'date',
    label: 'Tarikh',
    icon: 'bi-calendar',
    description: 'Pemilih tarikh',
    hasOptions: false
  },
  {
    type: 'time',
    label: 'Masa',
    icon: 'bi-clock',
    description: 'Pemilih masa',
    hasOptions: false
  },
  {
    type: 'file',
    label: 'Muat Naik Fail',
    icon: 'bi-paperclip',
    description: 'Muat naik gambar atau dokumen',
    hasOptions: false
  }
];

export function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createDefaultField(type: FieldType, order: number): FormField {
  const config = FIELD_TYPES.find(f => f.type === type);

  const field: FormField = {
    id: generateFieldId(),
    type,
    label: config?.label || 'Field Baru',
    placeholder: config?.defaultPlaceholder,
    required: false,
    order
  };

  if (config?.hasOptions) {
    field.options = ['Pilihan 1', 'Pilihan 2', 'Pilihan 3'];
  }

  if (type === 'file') {
    field.validation = {
      fileTypes: ['jpg', 'jpeg', 'png', 'pdf'],
      maxFileSize: 5
    };
  }

  return field;
}
