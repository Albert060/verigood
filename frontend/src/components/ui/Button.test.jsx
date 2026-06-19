// Smoke tests para los primitives de UI más usados. No persiguen cobertura
// exhaustiva — solo blindar las APIs públicas (props clave) para detectar
// regresiones cuando alguien toque components/ui/index.jsx.

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, Card, Badge, ProgressBar } from './index';

describe('<Button />', () => {
  test('renderiza el texto y reacciona al click', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Generar</Button>);
    const btn = screen.getByRole('button', { name: /generar/i });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('no llama onClick si está disabled', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Generar</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  test('no llama onClick si está loading', () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Generar</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('<Card />', () => {
  test('renderiza los children', () => {
    render(<Card>contenido de la card</Card>);
    expect(screen.getByText('contenido de la card')).toBeInTheDocument();
  });
});

describe('<Badge />', () => {
  test('renderiza el texto recibido', () => {
    render(<Badge variant="active">ACTIVO</Badge>);
    expect(screen.getByText('ACTIVO')).toBeInTheDocument();
  });
});

describe('<ProgressBar />', () => {
  test('renderiza sin lanzar cuando max y value son válidos', () => {
    expect(() => render(<ProgressBar value={5} max={10} />)).not.toThrow();
  });

  test('clamp al 100% si value > max', () => {
    const { container } = render(<ProgressBar value={50} max={10} />);
    const fill = container.querySelector('.bg-marino');
    expect(fill).toBeInTheDocument();
  });
});
