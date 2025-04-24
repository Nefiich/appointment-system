'use client'
import React, { useState, useRef } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createBrowserClient } from '@/lib/supabase'

const PinCreation = ({ onComplete, phoneNumber }) => {
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const inputRefs = useRef([])
  const confirmInputRefs = useRef([])
  const supabase = createBrowserClient()

  // Initialize refs array
  React.useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6)
    confirmInputRefs.current = confirmInputRefs.current.slice(0, 6)
  }, [])

  const handlePinChange = (index, value, isPinConfirm = false) => {
    if (value.length > 1) {
      value = value.slice(-1)
    }

    // Only allow digits
    if (!/^\d*$/.test(value)) {
      return
    }

    const newPin = isPinConfirm ? [...confirmPin] : [...pin]
    newPin[index] = value
    
    isPinConfirm ? setConfirmPin(newPin) : setPin(newPin)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInputRef = isPinConfirm ? confirmInputRefs.current[index + 1] : inputRefs.current[index + 1]
      nextInputRef.focus()
    }
  }

  const handleKeyDown = (index, e, isPinConfirm = false) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      // Focus previous input on backspace if current input is empty
      const prevInputRef = isPinConfirm ? confirmInputRefs.current[index - 1] : inputRefs.current[index - 1]
      prevInputRef.focus()
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const pinValue = pin.join('')
      const confirmPinValue = confirmPin.join('')

      // Validate PIN
      if (pinValue.length !== 6) {
        setError('Please enter a valid 6-digit PIN')
        setLoading(false)
        return
      }

      // Check if PINs match
      if (pinValue !== confirmPinValue) {
        setError('PINs do not match. Please try again.')
        setLoading(false)
        return
      }

      // Update user with new password (PIN)
      const { data, error } = await supabase.auth.updateUser({ 
        password: pinValue 
      })

      if (error) {
        console.error('Error setting PIN:', error)
        setError(error.message || 'Failed to set PIN. Please try again.')
        setLoading(false)
        return
      }

      // Success
      setSuccess(true)
      setTimeout(() => {
        onComplete && onComplete()
      }, 1500)
    } catch (err) {
      console.error('Error setting PIN:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl font-semibold">
            PIN Set Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <p className="text-center">
            Your PIN has been set successfully. You can now use it to log in.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-xl font-semibold">
          Create a PIN
        </CardTitle>
        <CardDescription className="text-center">
          Please create a 6-digit PIN to secure your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="pin">Enter 6-digit PIN</Label>
          <div className="flex justify-between">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Input
                key={`pin-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="h-12 w-12 text-center text-lg"
                value={pin[index]}
                onChange={(e) => handlePinChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                ref={(el) => (inputRefs.current[index] = el)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-pin">Confirm PIN</Label>
          <div className="flex justify-between">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Input
                key={`confirm-pin-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="h-12 w-12 text-center text-lg"
                value={confirmPin[index]}
                onChange={(e) => handlePinChange(index, e.target.value, true)}
                onKeyDown={(e) => handleKeyDown(index, e, true)}
                ref={(el) => (confirmInputRefs.current[index] = el)}
              />
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleSubmit} 
          disabled={loading || pin.some(digit => digit === '') || confirmPin.some(digit => digit === '')}
        >
          {loading ? 'Setting PIN...' : 'Set PIN'}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default PinCreation