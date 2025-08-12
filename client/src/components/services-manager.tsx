import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Settings, DollarSign, Clock, ToggleLeft, ToggleRight } from "lucide-react";
import { insertServiceSchema } from "@shared/schema";
import { z } from "zod";
import type { Service } from "@shared/schema";

const serviceFormSchema = insertServiceSchema.extend({
  basePrice: z.number({ required_error: "Base price is required" }).min(0),
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;

const categories = [
  { value: "electrical", label: "Electrical Work" },
  { value: "plumbing", label: "Plumbing" },
  { value: "tech", label: "Tech Support & Smart Home" },
  { value: "carpentry", label: "Carpentry" },
  { value: "general", label: "General Handyman" },
  { value: "painting", label: "Painting" },
  { value: "hvac", label: "HVAC" },
];

const priceUnits = [
  { value: "per hour", label: "Per Hour" },
  { value: "flat rate", label: "Flat Rate" },
  { value: "per square foot", label: "Per Square Foot" },
  { value: "per project", label: "Per Project" },
];

const skillLevels = [
  { value: "basic", label: "Basic" },
  { value: "standard", label: "Standard" },
  { value: "expert", label: "Expert" },
];

export default function ServicesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"]
  });

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      basePrice: 0,
      priceUnit: "per hour",
      isActive: true,
      estimatedDuration: "",
      skillLevel: "standard",
      includedInQuoteCalculator: true,
      displayOrder: 0,
    },
  });

  const createService = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create service");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Service created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create service", variant: "destructive" });
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ServiceFormData }) => {
      const response = await fetch(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update service");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Service updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update service", variant: "destructive" });
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete service");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Service deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete service", variant: "destructive" });
    },
  });

  const toggleServiceStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/services/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Failed to toggle service status");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Service status updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update service status", variant: "destructive" });
    },
  });

  const resetForm = () => {
    form.reset();
    setEditingService(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    form.reset({
      name: service.name,
      description: service.description,
      category: service.category,
      basePrice: service.basePrice,
      priceUnit: service.priceUnit ?? "per hour",
      isActive: service.isActive ?? true,
      estimatedDuration: service.estimatedDuration ?? "",
      skillLevel: service.skillLevel ?? "standard",
      includedInQuoteCalculator: service.includedInQuoteCalculator ?? true,
      displayOrder: service.displayOrder ?? 0,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: ServiceFormData) => {
    if (editingService) {
      updateService.mutate({ id: editingService.id, data });
    } else {
      createService.mutate(data);
    }
  };

  const getCategoryLabel = (category: string) => {
    return categories.find(c => c.value === category)?.label || category;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Services Management
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-red hover:bg-brand-red-dark" onClick={() => setEditingService(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Service Name</Label>
                      <Input {...form.register("name")} placeholder="e.g., Outlet Installation" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={form.watch("category")}
                        onValueChange={(value) => form.setValue("category", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      {...form.register("description")}
                      placeholder="Detailed description of the service..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="basePrice">Base Price ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...form.register("basePrice", { valueAsNumber: true })}
                        placeholder="150.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priceUnit">Price Unit</Label>
                      <Select
                        value={form.watch("priceUnit") || ""}
                        onValueChange={(value) => form.setValue("priceUnit", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priceUnits.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimatedDuration">Estimated Duration</Label>
                      <Input
                        {...form.register("estimatedDuration")}
                        placeholder="e.g., 2-3 hours"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="skillLevel">Skill Level</Label>
                      <Select
                        value={form.watch("skillLevel") || ""}
                        onValueChange={(value) => form.setValue("skillLevel", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {skillLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayOrder">Display Order</Label>
                      <Input
                        type="number"
                        {...form.register("displayOrder", { valueAsNumber: true })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={form.watch("isActive") ?? false}
                          onCheckedChange={(checked) => form.setValue("isActive", checked)}
                        />
                        <Label>Active</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={form.watch("includedInQuoteCalculator") ?? false}
                          onCheckedChange={(checked) => form.setValue("includedInQuoteCalculator", checked)}
                        />
                        <Label>Include in Quote Calculator</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-brand-red hover:bg-brand-red-dark"
                      disabled={createService.isPending || updateService.isPending}
                    >
                      {editingService ? "Update Service" : "Create Service"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {services.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Service</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Price</TableHead>
                  <TableHead className="font-semibold">Duration</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-[200px]">
                            {service.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCategoryLabel(service.category)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {service.basePrice} {service.priceUnit}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {service.estimatedDuration ?? "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={(service.isActive ?? true) ? "default" : "secondary"}>
                            {(service.isActive ?? true) ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleServiceStatus.mutate({ 
                              id: service.id, 
                              isActive: !(service.isActive ?? true)
                            })}
                            disabled={toggleServiceStatus.isPending}
                          >
                            {(service.isActive ?? true) ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            onClick={() => handleEdit(service)}
                            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 px-3 py-1"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
                                deleteService.mutate(service.id);
                              }
                            }}
                            disabled={deleteService.isPending}
                            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 px-3 py-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Remove</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No services configured</p>
              <p className="text-sm">Add your first service to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}