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
      {toasts && toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
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
