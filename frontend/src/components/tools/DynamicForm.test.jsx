// DynamicForm es el form genérico que renderiza el input_schema de cualquier
// tool. Si se rompe, ningún módulo del catálogo Fase 1 puede ejecutarse.

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DynamicForm from './DynamicForm';

const SCHEMA = {
  fields: [
    { key: 'topic', label: 'Tema', type: 'text', required: true, placeholder: 'Sumas' },
    { key: 'level', label: 'Nivel', type: 'select', options: ['A1', 'A2', 'B1'], required: true },
    { key: 'count', label: 'Nº de ejercicios', type: 'number', min: 3, max: 20, default: 10 },
    { key: 'notes', label: 'Notas', type: 'textarea' },
  ],
};

describe('<DynamicForm />', () => {
  test('renderiza los 4 campos del schema con sus labels', () => {
    render(<DynamicForm schema={SCHEMA} value={{}} onChange={() => {}} />);
    expect(screen.getByText('Tema')).toBeInTheDocument();
    expect(screen.getByText('Nivel')).toBeInTheDocument();
    expect(screen.getByText('Nº de ejercicios')).toBeInTheDocument();
    expect(screen.getByText('Notas')).toBeInTheDocument();
  });

  test('marca los campos required con asterisco granate', () => {
    render(<DynamicForm schema={SCHEMA} value={{}} onChange={() => {}} />);
    // Los required son topic y level → al menos dos asteriscos
    const asterisks = screen.getAllByText('*');
    expect(asterisks.length).toBeGreaterThanOrEqual(2);
  });

  test('invoca onChange al editar un campo de texto', () => {
    const onChange = vi.fn();
    render(<DynamicForm schema={SCHEMA} value={{}} onChange={onChange} />);
    const input = screen.getByPlaceholderText('Sumas');
    fireEvent.change(input, { target: { value: 'fracciones' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ topic: 'fracciones' }));
  });

  test('respeta el valor actual del estado en lugar del default', () => {
    render(<DynamicForm schema={SCHEMA} value={{ count: 5 }} onChange={() => {}} />);
    const numberInput = screen.getByDisplayValue('5');
    expect(numberInput).toBeInTheDocument();
  });

  test('select muestra todas las opciones', () => {
    render(<DynamicForm schema={SCHEMA} value={{}} onChange={() => {}} />);
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('A2')).toBeInTheDocument();
    expect(screen.getByText('B1')).toBeInTheDocument();
  });

  test('no peta si el schema es null', () => {
    expect(() => render(<DynamicForm schema={null} value={{}} onChange={() => {}} />)).not.toThrow();
  });
});
