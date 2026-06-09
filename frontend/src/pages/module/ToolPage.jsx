import { useParams, useOutletContext, Navigate } from 'react-router-dom';
import ToolRunner from '../../components/tools/ToolRunner';

// Wrapper: lee el :toolKey de la URL, comprueba que existe en las tools del
// módulo y monta el runner. Si no existe, redirige al inicio del módulo.
export default function ToolPage() {
  const { toolKey } = useParams();
  const { moduleId, mod, tools } = useOutletContext();
  const tool = tools.find((t) => t.key === toolKey);

  if (!tool) {
    return <Navigate to={mod?.route_prefix || '/dashboard'} replace />;
  }

  return <ToolRunner moduleId={moduleId} tool={tool} />;
}
