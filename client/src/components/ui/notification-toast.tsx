import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function NotificationToast() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} data-testid={`toast-${id}`}>
            <div className="grid gap-1">
              {title && <ToastTitle data-testid={`toast-title-${id}`}>{title}</ToastTitle>}
              {description && (
                <ToastDescription data-testid={`toast-description-${id}`}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose data-testid={`toast-close-${id}`} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

export default NotificationToast;
