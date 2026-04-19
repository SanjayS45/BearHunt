'use client'
import { useToast } from '@/hooks/use-toast'
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastClose } from './ui/toast'

export function Toaster() {
  const { toasts } = useToast()
  return (
    <ToastProvider>
      {toasts.map(t => (
        <Toast key={t.id} variant={t.variant}>
          <ToastTitle>{t.title}</ToastTitle>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
