import { useDiscreet } from '../App.jsx';

export function initials(s) {
  return `${s.first_name?.[0] ?? ''}${s.last_name?.[0] ?? ''}`.toUpperCase();
}

export default function StudentName({ student }) {
  const { discreet } = useDiscreet();
  return discreet ? initials(student) : `${student.first_name} ${student.last_name}`;
}
