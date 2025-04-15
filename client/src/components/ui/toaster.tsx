import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useEffect } from "react"

// This ensures the toast variant can be "success"
type ToastVariant = "default" | "destructive" | "success";

export function Toaster() {
  const { toasts, dismissToast } = useToast()

  useEffect(() => {
    toasts.forEach(toast => {
      if (toast.duration) {
        const timer = setTimeout(() => {
          dismissToast(toast.id)
        }, toast.duration)

        return () => clearTimeout(timer)
      }
    })
  }, [toasts, dismissToast])

  return (
    <ToastProvider>
      {toasts && toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Add special styling for success toasts
        const isSuccessToast = variant === 'success';
        return (
          <Toast key={id} variant={variant} {...props} className={isSuccessToast ? 'border-2 shadow-xl' : ''}>
            <div className="grid gap-1">
              {title && <ToastTitle className={isSuccessToast ? 'text-lg' : ''}>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose onClick={() => dismissToast(id)} />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
