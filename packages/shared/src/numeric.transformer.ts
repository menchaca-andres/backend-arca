// TypeORM devuelve numeric como string; aquí se convierte a number.
export const numericTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
