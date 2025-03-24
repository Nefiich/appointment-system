'use client'
import React, { useState, useRef, useEffect } from 'react'
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
import { AlertCircle, CheckCircle2, Phone } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

const UserLoginSteps = () => {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('') // Add name state
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false) // Add loading state
  const supabase = createBrowserClient()

  // OTP related states
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  const router = useRouter()

  useEffect(() => {
    // Initialize refs array
    inputRefs.current = inputRefs.current.slice(0, 6)
  }, [])

  const validatePhoneNumber = (number: string) => {
    return true
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    return phoneRegex.test(number)
  }

  const handleNext = async () => {
    setLoading(true)
    try {
      if (step === 1) {
        if (!name) {
          setError('Please enter your name')
          setLoading(false)
          return
        }
        
        if (!phoneNumber) {
          setError('Please enter your phone number')
          setLoading(false)
          return
        }
        
        if (!validatePhoneNumber(phoneNumber)) {
          setError('Please enter a valid phone number')
          setLoading(false)
          return
        }
        
        setError('')
        const { data, error } = await supabase.auth.signInWithOtp({
          phone: `+387${phoneNumber}`,
        })
        
        if (error) {
          setError(error.message || 'Failed to send verification code')
          setLoading(false)
          return
        }

        setStep(2)
      } else if (step === 2) {
        // Validate OTP
        const otpValue = otp.join('')

        if (otpValue.length !== 6) {
          setError('Please enter a valid 6-digit OTP')
          setLoading(false)
          return
        }
        
        const {
          data: { session, user },
          error,
        } = await supabase.auth.verifyOtp({
          phone: `+387${phoneNumber}`,
          token: otpValue,
          type: 'sms',
        })
        
        if (error) {
          setError(error.message || 'Invalid verification code')
          setLoading(false)
          return
        }
        
        if (user && session) {
          // Store user data in the users table
          const { error: profileError } = await supabase
            .from('users')
            .upsert({
              user_id: user.id,
              name: name,
              phone_number: `+387${phoneNumber}`
            }, { 
              onConflict: 'user_id' 
            })
            
          if (profileError) {
            console.error('Error saving user profile:', profileError)
            // Continue anyway since authentication was successful
          }
          
          setSubmitted(true)
          setTimeout(() => {
            router.push('/rezervacija/')
          }, 1500)
        } else {
          setError('Verification failed. Please try again.')
        }
      }
    } catch (err) {
      console.error('Authentication error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep(1)
    setError('')
  }

  const handleReset = () => {
    setStep(1)
    setName('') // Reset name
    setPhoneNumber('')
    setOtp(['', '', '', '', '', ''])
    setError('')
    setSubmitted(false)
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1)
    }

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Focus previous input on backspace if current input is empty
      inputRefs.current[index - 1].focus()
    }
  }

  if (submitted) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl font-semibold">
            Success!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <p className="text-center">
            Your phone number has been successfully verified!
          </p>
          <p className="text-center text-sm text-gray-500">Welcome, {name}!</p>
          <p className="text-center text-sm text-gray-500">{phoneNumber}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleReset} className="w-full">
            Verify Another Number
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="jusitfy-center flex min-h-full w-full flex-1 flex-col items-center">
      <Image
        src={'/assets/images/logo-white.jpg'}
        alt={''}
        width={200}
        height={200}
      />
      <h1 className="mt-10 text-6xl font-bold">Uskoro s vama!</h1>
      <Card className="mx-auto mt-10 w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Phone Number Verification
          </CardTitle>
          <CardDescription>Step {step} of 2</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Enter your name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Enter your phone number</Label>
                <div className="flex space-x-2">
                  <Phone className="mt-3 h-4 w-4" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Enter verification code</Label>
                <p className="text-sm text-gray-500">
                  Weve sent a 6-digit code to {phoneNumber}
                </p>
              </div>
              <div className="flex justify-center space-x-2">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    pattern="\d"
                    className="h-12 w-12 text-center text-lg"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    ref={(el) => (inputRefs.current[index] = el)}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {step === 2 && (
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              Back
            </Button>
          )}
          <Button 
            className={step === 1 ? 'w-full' : ''} 
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? 'Processing...' : step === 2 ? 'Verify' : 'Next'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default UserLoginSteps
