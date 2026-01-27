'use client';

import { useState } from 'react';
import { FormField, FieldType, FIELD_TYPES, createDefaultField } from './FieldTypes';
import FieldEditor from './FieldEditor';

interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draggedFieldType, setDraggedFieldType] = useState<FieldType | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const selectedField = fields.find(f => f.id === selectedFieldId);

  const handleAddField = (type: FieldType) => {
    const newField = createDefaultField(type, fields.length);
    onChange([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleUpdateField = (updatedField: FormField) => {
    onChange(fields.map(f => f.id === updatedField.id ? updatedField : f));
  };

  const handleDeleteField = (fieldId: string) => {
    onChange(fields.filter(f => f.id !== fieldId).map((f, idx) => ({ ...f, order: idx })));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleDuplicateField = (field: FormField) => {
    const newField = {
      ...field,
      id: `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      label: `${field.label} (salinan)`,
      order: fields.length
    };
    onChange([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleMoveField = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newFields = [...fields];
    const [removed] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, removed);

    onChange(newFields.map((f, idx) => ({ ...f, order: idx })));
  };

  const handleDragStart = (e: React.DragEvent, type: FieldType) => {
    setDraggedFieldType(type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleFieldDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('fieldIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedFieldType) {
      const newField = createDefaultField(draggedFieldType, index);
      const newFields = [...fields];
      newFields.splice(index, 0, newField);
      onChange(newFields.map((f, idx) => ({ ...f, order: idx })));
      setSelectedFieldId(newField.id);
      setDraggedFieldType(null);
    } else {
      const fromIndex = parseInt(e.dataTransfer.getData('fieldIndex'));
      if (!isNaN(fromIndex)) {
        handleMoveField(fromIndex, index);
      }
    }
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedFieldType) {
      handleAddField(draggedFieldType);
      setDraggedFieldType(null);
    }
  };

  const renderFieldPreview = (field: FormField) => {
    switch (field.type) {
      case 'heading':
        return (
          <div className="border-bottom pb-2">
            <h5 className="mb-0 text-primary">{field.placeholder || 'Tajuk Seksyen'}</h5>
          </div>
        );
      case 'paragraph':
        return (
          <div className="bg-light p-2 rounded small text-muted">
            {field.placeholder || 'Keterangan atau arahan akan dipaparkan di sini...'}
          </div>
        );
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <input
            type={field.type === 'phone' ? 'tel' : field.type}
            className="form-control form-control-sm"
            placeholder={field.placeholder}
            disabled
          />
        );
      case 'textarea':
        return (
          <textarea
            className="form-control form-control-sm"
            placeholder={field.placeholder}
            rows={2}
            disabled
          ></textarea>
        );
      case 'dropdown':
        return (
          <select className="form-select form-select-sm" disabled>
            <option>Pilih...</option>
            {field.options?.map((opt, i) => (
              <option key={i}>{opt}</option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div>
            {field.options?.slice(0, 3).map((opt, i) => (
              <div className="form-check form-check-inline" key={i}>
                <input type="radio" className="form-check-input" disabled />
                <label className="form-check-label small">{opt}</label>
              </div>
            ))}
            {(field.options?.length || 0) > 3 && <span className="text-muted small">...</span>}
          </div>
        );
      case 'checkbox':
        return (
          <div>
            {field.options?.slice(0, 3).map((opt, i) => (
              <div className="form-check" key={i}>
                <input type="checkbox" className="form-check-input" disabled />
                <label className="form-check-label small">{opt}</label>
              </div>
            ))}
            {(field.options?.length || 0) > 3 && <span className="text-muted small">...</span>}
          </div>
        );
      case 'multiselect':
        return (
          <select className="form-select form-select-sm" multiple disabled style={{ height: '60px' }}>
            {field.options?.map((opt, i) => (
              <option key={i}>{opt}</option>
            ))}
          </select>
        );
      case 'date':
        return <input type="date" className="form-control form-control-sm" disabled />;
      case 'time':
        return <input type="time" className="form-control form-control-sm" disabled />;
      case 'file':
        return (
          <input type="file" className="form-control form-control-sm" disabled />
        );
      default:
        return null;
    }
  };

  return (
    <div className="row g-4" style={{ position: 'relative' }}>
      {/* Sidebar - Field Types */}
      <div className="col-md-3">
        <div className="card sticky-top" style={{ top: '1rem' }}>
          <div className="card-header py-2">
            <h6 className="mb-0">
              <i className="bi bi-ui-checks me-2"></i>
              Jenis Field
            </h6>
          </div>
          <div className="card-body p-2" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="d-flex flex-wrap gap-2">
              {FIELD_TYPES.map((fieldType) => (
                <button
                  key={fieldType.type}
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                  draggable
                  onDragStart={(e) => handleDragStart(e, fieldType.type)}
                  onClick={() => handleAddField(fieldType.type)}
                  title={fieldType.description}
                  style={{ cursor: 'grab' }}
                >
                  <i className={fieldType.icon}></i>
                  <span className="small">{fieldType.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 p-2 bg-light rounded small text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Klik atau drag field ke canvas untuk menambah
            </div>
          </div>
        </div>
      </div>

      {/* Canvas - Form Fields */}
      <div className="col-md-9">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center py-2">
            <h6 className="mb-0">
              <i className="bi bi-layout-text-window-reverse me-2"></i>
              Canvas Borang
            </h6>
            <span className="badge bg-secondary">{fields.length} field</span>
          </div>
          <div
            className="card-body"
            style={{ minHeight: '400px', backgroundColor: '#f8f9fa' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCanvasDrop}
          >
            {fields.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-arrow-down-circle fs-1 d-block mb-3"></i>
                <h5>Tiada field lagi</h5>
                <p>Klik atau drag field dari sidebar untuk menambah</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className={`card ${selectedFieldId === field.id ? 'border-primary shadow-sm' : ''} ${dragOverIndex === index ? 'border-2 border-dashed border-primary' : ''}`}
                    onClick={() => setSelectedFieldId(field.id)}
                    draggable
                    onDragStart={(e) => handleFieldDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-grip-vertical text-muted" style={{ cursor: 'grab' }}></i>
                          <span className="badge bg-light text-dark">
                            <i className={`${FIELD_TYPES.find(f => f.type === field.type)?.icon} me-1`}></i>
                            {FIELD_TYPES.find(f => f.type === field.type)?.label}
                          </span>
                          {field.required && <span className="badge bg-danger">Wajib</span>}
                        </div>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={(e) => { e.stopPropagation(); handleDuplicateField(field); }}
                            title="Salin"
                          >
                            <i className="bi bi-copy"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id); }}
                            title="Padam"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                      <label className="form-label small fw-medium mb-1">
                        {field.label}
                        {field.required && <span className="text-danger ms-1">*</span>}
                      </label>
                      {renderFieldPreview(field)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Field Editor Sidebar */}
      {selectedField && (
        <FieldEditor
          field={selectedField}
          onUpdate={handleUpdateField}
          onClose={() => setSelectedFieldId(null)}
        />
      )}
    </div>
  );
}
