'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Search, Check, X, Edit2, Save, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/toaster'
import { toast } from '@/hooks/use-toast'
import { createBrowserClient } from '@/lib/supabase'

// User type definition
type User = {
  id: number
  name: string
  phone_number: string
  custom_password_set: boolean
}

export default function UsersTable() {
  const supabase = createBrowserClient()
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<User | null>(null)
  const itemsPerPage = 50

  const [filteredUsers, setFilteredUsers] = useState([])
  const [totalPages, setTotalPages] = useState(0)
  const [startIndex, setStartIndex] = useState(0)
  const [paginatedUsers, setPaginatedUsers] = useState([])

  const getUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*')
      console.log('DATA: ', data, error)

      if (data !== null && !error) {
        console.log('DATA: ', data)
        setUsers(data)

        // Filter users based on search query
        const filteredUsers = data?.filter((user) =>
          user.phone_number.toLowerCase().includes(searchQuery.toLowerCase()),
        )

        // Calculate pagination
        const totalPages = Math.ceil(filteredUsers?.length / itemsPerPage)
        const startIndex = (currentPage - 1) * itemsPerPage
        const paginatedUsers = filteredUsers?.slice(
          startIndex,
          startIndex + itemsPerPage,
        )

        setTotalPages(totalPages)
        setStartIndex(startIndex)
        setPaginatedUsers(paginatedUsers)
      }
    } catch (error) {
      console.log('ERR: ', error)
    }
  }

  const handleSearch = (localUsers: any[]) => {
    if (!localUsers) {
      localUsers = users
    }
    const filteredUsers = localUsers?.filter((user) =>
      user.phone_number.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    // Calculate pagination
    const totalPages = Math.ceil(filteredUsers?.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedUsers = filteredUsers?.slice(
      startIndex,
      startIndex + itemsPerPage,
    )

    setTotalPages(totalPages)
    setStartIndex(startIndex)
    setPaginatedUsers(paginatedUsers)
  }

  useEffect(() => {
    getUsers()
  }, [])

  useEffect(() => {
    handleSearch()
  }, [searchQuery])

  // Start editing a user
  const handleEdit = (user: User) => {
    setEditingId(user.id)
    setEditForm({ ...user })
  }

  // Cancel editing
  const handleCancel = () => {
    setEditingId(null)
    setEditForm(null)
  }

  // Save edited user
  const handleSave = async () => {
    if (!editForm) return

    console.log('EDIT FORM; ', editForm)

    // Basic validation
    if (!editForm.name.trim()) {
      toast({
        title: 'Error',
        description: 'Name cannot be empty',
        variant: 'destructive',
      })
      return
    }

    if (!editForm.phone_number.trim()) {
      toast({
        title: 'Error',
        description: 'Phone number cannot be empty',
        variant: 'destructive',
      })
      return
    }

    const newUsers = users.map((user) =>
      user.id === editForm.id ? { ...editForm } : user,
    )

    // Update users array
    setUsers(newUsers)

    const { data, error } = await supabase
      .from('users')
      .upsert(editForm)
      .select()

    console.log('DATA, ERR: ', data, error)

    handleSearch(newUsers)
    // Reset editing state
    setEditingId(null)
    setEditForm(null)

    toast({
      title: 'Success',
      description: 'User updated successfully',
      duration: 3000,
    })
  }

  // Handle form field changes
  const handleChange = (field: keyof User, value: string | boolean) => {
    if (!editForm) return
    setEditForm({ ...editForm, [field]: value })
  }

  return (
    <div className="min-h-screen p-4 text-white md:p-8">
      <Card className="container mx-auto max-w-4xl">
        <CardHeader className="px-0 pt-5">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold text-white">
            Users Directory
          </CardTitle>

          {/* Search bar */}
          <div className="relative mt-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              placeholder="Search by phone number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1) // Reset to first page on new search
              }}
              className="border-gray-700 bg-gray-800 pl-10 text-white placeholder:text-gray-400 focus-visible:ring-purple-500"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Users table */}
          <div className="overflow-hidden rounded-md">
            <Table>
              <TableHeader className="bg-gray-800">
                <TableRow className="border-gray-700 hover:bg-gray-800">
                  <TableHead className="font-medium text-gray-300">
                    Ime
                  </TableHead>
                  <TableHead className="font-medium text-gray-300">
                    Broj Telefona
                  </TableHead>
                  <TableHead className="font-medium text-gray-300">
                    Postavljena Šifra
                  </TableHead>
                  <TableHead className="w-[100px] font-medium text-gray-300">
                    Akcija
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers?.length > 0 ? (
                  paginatedUsers?.map((user) => (
                    <TableRow
                      key={user.id}
                      className={`border-gray-800 transition-colors ${
                        editingId === user.id
                          ? 'bg-gray-800/80'
                          : 'hover:bg-gray-800/50'
                      }`}
                    >
                      <TableCell className="font-medium text-white">
                        {editingId === user.id ? (
                          <Input
                            value={editForm?.name || ''}
                            onChange={(e) =>
                              handleChange('name', e.target.value)
                            }
                            className="h-9 border-gray-700 bg-gray-800 text-white"
                          />
                        ) : (
                          user.name
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {editingId === user.id ? (
                          <Input
                            value={editForm?.phone_number || ''}
                            onChange={(e) =>
                              handleChange('phone_number', e.target.value)
                            }
                            className="h-9 border-gray-700 bg-gray-800 text-white"
                          />
                        ) : (
                          user.phone_number
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === user.id ? (
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={editForm?.custom_password_set || false}
                              onCheckedChange={(checked) =>
                                handleChange('custom_password_set', checked)
                              }
                              className="data-[state=checked]:bg-green-500"
                            />
                            <Label className="text-sm text-gray-300">
                              {editForm?.custom_password_set
                                ? 'Set'
                                : 'Not Set'}
                            </Label>
                          </div>
                        ) : user.custom_password_set ? (
                          <Badge
                            variant="outline"
                            className="flex w-fit items-center gap-1 border-green-500 bg-green-900/30 text-green-400"
                          >
                            <Check className="h-3 w-3" /> Set
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="flex w-fit items-center gap-1 border-red-500 bg-red-900/30 text-red-400"
                          >
                            <X className="h-3 w-3" /> Not Set
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === user.id ? (
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleSave}
                              className="h-8 w-8 text-green-500 hover:bg-green-900/20 hover:text-green-400"
                            >
                              <Save className="h-4 w-4" />
                              <span className="sr-only">Save</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCancel}
                              className="h-8 w-8 text-red-500 hover:bg-red-900/20 hover:text-red-400"
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="sr-only">Cancel</span>
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                            className="h-8 w-8 text-gray-400 hover:bg-gray-800 hover:text-white"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-gray-800/50">
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-gray-400"
                    >
                      No users found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination controls */}
          {filteredUsers?.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-800 p-4">
              <p className="text-sm text-gray-400">
                Showing {startIndex + 1}-
                {Math.min(startIndex + itemsPerPage, filteredUsers?.length)} of{' '}
                {filteredUsers?.length} users
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="border-gray-700 bg-gray-800 text-white hover:bg-gray-700 disabled:text-gray-500"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="border-gray-700 bg-gray-800 text-white hover:bg-gray-700 disabled:text-gray-500"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Toaster />
    </div>
  )
}
