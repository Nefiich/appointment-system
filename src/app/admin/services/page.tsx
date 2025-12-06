'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2, Plus, X } from 'lucide-react';

const supabase = createBrowserClient();

interface Service {
  id: number;
  name: string;
  name_bs: string;
  duration_minutes: number;
  color: string;
  display_order: number;
  is_active: boolean;
}

const availableColors = [
  { value: 'blue', label: 'Plava', class: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'green', label: 'Zelena', class: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'red', label: 'Crvena', class: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'yellow', label: 'Žuta', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'purple', label: 'Ljubičasta', class: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'orange', label: 'Narandžasta', class: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'teal', label: 'Tirkizna', class: 'bg-teal-100 text-teal-800 border-teal-200' },
  { value: 'gray', label: 'Siva', class: 'bg-gray-100 text-gray-800 border-gray-200' },
];

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_bs: '',
    duration_minutes: 30,
    color: 'blue',
    is_active: true,
  });

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !session.user.email) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching services:', error);
        return;
      }

      setServices(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        name_bs: service.name_bs,
        duration_minutes: service.duration_minutes,
        color: service.color,
        is_active: service.is_active,
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        name_bs: '',
        duration_minutes: 30,
        color: 'blue',
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingService(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingService) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update({
            name: formData.name,
            name_bs: formData.name_bs,
            duration_minutes: formData.duration_minutes,
            color: formData.color,
            is_active: formData.is_active,
          })
          .eq('id', editingService.id);

        if (error) throw error;
        alert('Usluga uspješno ažurirana!');
      } else {
        // Create new service
        // Get the highest display_order
        const maxOrder =
          services.length > 0
            ? Math.max(...services.map((s) => s.display_order))
            : -1;

        const { error } = await supabase.from('services').insert([
          {
            name: formData.name,
            name_bs: formData.name_bs,
            duration_minutes: formData.duration_minutes,
            color: formData.color,
            is_active: formData.is_active,
            display_order: maxOrder + 1,
          },
        ]);

        if (error) throw error;
        alert('Usluga uspješno dodana!');
      }

      handleCloseModal();
      fetchServices();
    } catch (err) {
      console.error('Error saving service:', err);
      alert('Greška pri čuvanju usluge');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovu uslugu?')) {
      return;
    }

    try {
      // Check if there are any appointments using this service
      const { data: appointments, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('service', id)
        .limit(1);

      if (checkError) throw checkError;

      if (appointments && appointments.length > 0) {
        alert(
          'Ne možete obrisati uslugu koja se koristi u postojećim terminima. Prvo sakrijte uslugu.'
        );
        return;
      }

      const { error } = await supabase.from('services').delete().eq('id', id);

      if (error) throw error;

      alert('Usluga uspješno obrisana!');
      fetchServices();
    } catch (err) {
      console.error('Error deleting service:', err);
      alert('Greška pri brisanju usluge');
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id);

      if (error) throw error;

      fetchServices();
    } catch (err) {
      console.error('Error toggling service:', err);
      alert('Greška pri promjeni statusa usluge');
    }
  };

  const moveService = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === services.length - 1)
    ) {
      return;
    }

    const newServices = [...services];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap display_order values
    const temp = newServices[index].display_order;
    newServices[index].display_order = newServices[swapIndex].display_order;
    newServices[swapIndex].display_order = temp;

    // Update in database
    try {
      const { error: error1 } = await supabase
        .from('services')
        .update({ display_order: newServices[index].display_order })
        .eq('id', newServices[index].id);

      const { error: error2 } = await supabase
        .from('services')
        .update({ display_order: newServices[swapIndex].display_order })
        .eq('id', newServices[swapIndex].id);

      if (error1 || error2) throw error1 || error2;

      fetchServices();
    } catch (err) {
      console.error('Error reordering services:', err);
      alert('Greška pri promjeni redoslijeda');
    }
  };

  const getColorClass = (color: string) => {
    return availableColors.find((c) => c.value === color)?.class || '';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Učitavanje usluga...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Upravljanje Uslugama</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Usluga
        </Button>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Naziv (Bosanski)</TableHead>
              <TableHead>Naziv (English)</TableHead>
              <TableHead>Trajanje</TableHead>
              <TableHead>Boja</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service, index) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>{service.name_bs}</TableCell>
                <TableCell>{service.name}</TableCell>
                <TableCell>{service.duration_minutes} min</TableCell>
                <TableCell>
                  <span
                    className={`rounded border px-2 py-1 text-xs ${getColorClass(service.color)}`}
                  >
                    {availableColors.find((c) => c.value === service.color)?.label}
                  </span>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={service.is_active}
                    onCheckedChange={() => handleToggleActive(service)}
                  />
                  <span className="ml-2 text-sm">
                    {service.is_active ? 'Aktivna' : 'Neaktivna'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveService(index, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveService(index, 'down')}
                      disabled={index === services.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenModal(service)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {services.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            Nema usluga. Kliknite "Nova Usluga" da dodate prvu uslugu.
          </div>
        )}
      </Card>

      {/* Modal for Add/Edit Service */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">
                {editingService ? 'Uredi Uslugu' : 'Nova Usluga'}
              </h2>
              <Button variant="ghost" size="icon" onClick={handleCloseModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name_bs" className="text-black">
                    Naziv (Bosanski) *
                  </Label>
                  <Input
                    id="name_bs"
                    value={formData.name_bs}
                    onChange={(e) =>
                      setFormData({ ...formData, name_bs: e.target.value })
                    }
                    required
                    placeholder="npr. Šišanje"
                    className="text-black"
                  />
                </div>

                <div>
                  <Label htmlFor="name" className="text-black">
                    Naziv (English)
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Haircut"
                    className="text-black"
                  />
                </div>

                <div>
                  <Label htmlFor="duration" className="text-black">
                    Trajanje (minute) *
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min="5"
                    max="180"
                    step="5"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_minutes: parseInt(e.target.value, 10),
                      })
                    }
                    required
                    className="text-black"
                  />
                </div>

                <div>
                  <Label htmlFor="color" className="text-black">
                    Boja (za kalendar) *
                  </Label>
                  <select
                    id="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-black"
                    required
                  >
                    {availableColors.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="is_active" className="text-black">
                    Aktivna usluga
                  </Label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Otkaži
                </Button>
                <Button type="submit">
                  {editingService ? 'Sačuvaj' : 'Dodaj'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
