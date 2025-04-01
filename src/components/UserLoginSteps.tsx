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
          options: {
            // Add metadata to identify this as a phone user
            data: {
              phone: true,
              name: name,
            },
          },
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
          const { error: profileError } = await supabase.from('users').insert(
            {
              user_id: user.id,
              name: name,
              phone_number: `+387${phoneNumber}`,
              is_phone_user: true, // Add this flag
            },
            {
              onConflict: 'user_id',
            },
          )

          if (profileError) {
            console.error('Error saving user profile:', profileError)
            // Continue anyway since authentication was successful
          }

          setSubmitted(true)
          setTimeout(() => {
            router.push('/rezervacije/')
          }, 1500)
        } else {
          setError('Verification failed. Please try again.')
        }
      }
    } catch (err) {
      console.error('Authentication error:', err)
      setError('Došlo je do neočekivane greške. Please try again.')
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
            Uspjeh!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <p className="text-center">
            Vaš broj telefona je uspješno verifikovan!
          </p>
          <p className="text-center text-sm text-gray-500">Welcome, {name}!</p>
          <p className="text-center text-sm text-gray-500">{phoneNumber}</p>
        </CardContent>
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
      <Card className="mx-auto mt-10 w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Prijava putem broja
          </CardTitle>
          <CardDescription>Step {step} od 2</CardDescription>
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
                <Label htmlFor="name">Unesite vaše ime</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ime i Prezime"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Unesite vaš broj telefona</Label>
                <div className="flex space-x-2">
                  <Phone className="mt-3 h-4 w-4" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="061123123"
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
                <Label>Unesite verifikacijski kod</Label>
                <p className="text-sm text-gray-500">
                  Poslali smo vam kod na broj telefona: {phoneNumber}
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
              Nazad
            </Button>
          )}
          <Button
            className={step === 1 ? 'w-full' : ''}
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? 'Processing...' : step === 2 ? 'Potvrdi' : 'Dalje'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default UserLoginSteps
