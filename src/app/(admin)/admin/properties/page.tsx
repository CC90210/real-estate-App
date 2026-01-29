'use client';

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Pencil, Trash } from "lucide-react";

export default function AdminPropertiesPage() {
    // Mock data for Admin table
    const properties = [
        { id: '1', address: '123 Main St', unit: '4B', status: 'available', rent: 2500 },
        { id: '2', address: '123 Main St', unit: '12A', status: 'rented', rent: 2800 },
        { id: '3', address: '456 Oak Ave', unit: '1', status: 'maintenance', rent: 1900 },
        { id: '4', address: '789 Pine Ln', unit: '101', status: 'available', rent: 2100 },
        { id: '5', address: '789 Pine Ln', unit: '102', status: 'pending', rent: 2100 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Property Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Create, edit, and delete properties.
                    </p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" /> Add Property
                </Button>
            </div>

            <div className="border rounded-lg bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Address</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Rent</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {properties.map((property) => (
                            <TableRow key={property.id}>
                                <TableCell className="font-medium">{property.address}</TableCell>
                                <TableCell>{property.unit}</TableCell>
                                <TableCell className="capitalize">{property.status}</TableCell>
                                <TableCell>${property.rent}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>
                                                <Pencil className="w-4 h-4 mr-2" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive">
                                                <Trash className="w-4 h-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
