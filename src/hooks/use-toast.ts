'use client'
import * as React from 'react'

type ToastVariant = 'default' | 'success' | 'error'

type Toast = {
  id: string
  title: string
  variant?: ToastVariant
}

type ToastState = {
  toasts: Toast[]
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string }

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD':
      return { toasts: [action.toast, ...state.toasts].slice(0, 3) }
    case 'REMOVE':
      return { toasts: state.toasts.filter(t => t.id !== action.id) }
  }
}

const listeners: Array<(state: ToastState) => void> = []
let memState: ToastState = { toasts: [] }

function dispatch(action: ToastAction) {
  memState = reducer(memState, action)
  listeners.forEach(l => l(memState))
}

export function toast(title: string, variant: ToastVariant = 'default') {
  const id = Math.random().toString(36).slice(2)
  dispatch({ type: 'ADD', toast: { id, title, variant } })
  setTimeout(() => dispatch({ type: 'REMOVE', id }), 3000)
}

export function useToast() {
  const [state, setState] = React.useState(memState)
  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const i = listeners.indexOf(setState)
      if (i > -1) listeners.splice(i, 1)
    }
  }, [])
  return state
}
