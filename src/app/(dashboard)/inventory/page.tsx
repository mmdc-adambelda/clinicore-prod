import { Metadata } from 'next'
import InventoryView from '@/components/inventory/InventoryView'
import { getInventory } from '@/lib/db'
export const metadata: Metadata = { title: 'Inventory' }
export default async function InventoryPage() {
  const { data: items } = await getInventory()
  return <InventoryView items={items} />
}
