import CsvImport from '@/components/crm/CsvImport'

export default function ImportPage() {
  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-pgm-ink">Import LinkedIn connections</h1>
        <p className="text-sm text-gray-500 mt-1">
          Export your connections from LinkedIn: Settings &amp; Privacy → Data Privacy → Get a copy of your data → Connections. Then upload the CSV here.
        </p>
      </div>
      <CsvImport />
    </div>
  )
}
