import '../../styles/components/toast.css';

function ToastMessage({ toast }) {
  return (
    <div className={`toast ${toast.show ? 'toast--visible' : ''} toast--${toast.type}`}>
      <span className="toast__icon">{toast.type === 'success' ? 'OK' : '!'}</span>
      <span>{toast.message}</span>
    </div>
  );
}

export default ToastMessage;
