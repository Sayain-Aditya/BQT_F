import { useParams } from 'react-router-dom';
import InvoiceEditor from '../components/invoice/InvoiceEditor';

const EditInvoice = () => {
  const { id } = useParams();
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Edit Invoice</h1>
      <InvoiceEditor invoiceId={id} />
    </div>
  );
};

export default EditInvoice;
