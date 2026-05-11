import { CheckCircle, Globe } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const FIELD_MAP = [
  { wp: "your-name", json: "name" },
  { wp: "your-email", json: "email" },
  { wp: "your-phone", json: "phone" },
  { wp: "how-heard", json: "hearAboutUs" },
  { wp: "your-message", json: "description" },
];

export default function WebsiteIntegrationPage() {
  const endpoint = `${API_URL}/intake/submit`;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Globe className="size-6 text-slate-600" />
        <h1 className="text-xl font-semibold text-slate-800">Website Integration</h1>
      </div>

      <p className="text-sm text-slate-600 mb-6">
        Connect your firm&apos;s WordPress contact form to Claudio so that new inquiries
        appear in the Intake queue automatically with AI analysis.
      </p>

      <section className="space-y-6">
        <Step n={1} title="Install two free WordPress plugins">
          <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1">
            <li>Go to <strong>WordPress Admin → Plugins → Add New</strong></li>
            <li>Search and install <strong>Contact Form 7</strong></li>
            <li>Search and install <strong>CF7 to Webhook</strong></li>
          </ol>
        </Step>

        <Step n={2} title="Configure the webhook in your contact form">
          <div className="text-sm text-slate-600 space-y-2">
            <p>
              Open your CF7 form and click the <strong>CF7 to Webhook</strong> tab. Set:
            </p>
            <table className="w-full text-xs border border-slate-200 rounded overflow-hidden">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50 w-40">Webhook URL</td>
                  <td className="px-3 py-2">
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 text-xs break-all">
                      {endpoint}
                    </code>
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50">Request Method</td>
                  <td className="px-3 py-2"><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">POST</code></td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50">Request Format</td>
                  <td className="px-3 py-2"><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">JSON</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Step>

        <Step n={3} title="Map your form fields">
          <table className="w-full text-xs border border-slate-200 rounded overflow-hidden">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left font-medium text-slate-600">CF7 field name</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">JSON key sent to Claudio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FIELD_MAP.map(({ wp, json }) => (
                <tr key={wp}>
                  <td className="px-3 py-2">
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded">{wp}</code>
                  </td>
                  <td className="px-3 py-2">
                    <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{json}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-2">
            <strong>required:</strong> name, description — all others optional.
          </p>
        </Step>

        <Step n={4} title="Allow your website's domain (CORS)">
          <p className="text-sm text-slate-600">
            Add the following to your server&apos;s <code className="bg-slate-100 px-1 rounded text-xs">.env</code> file,
            replacing with your actual domain:
          </p>
          <pre className="mt-2 bg-slate-800 text-green-300 text-xs rounded p-3 overflow-x-auto">
            {`PUBLIC_FORM_ALLOWED_ORIGINS=https://www.yourfirm.com,https://yourfirm.com`}
          </pre>
          <p className="text-xs text-slate-500 mt-1">Restart the server after saving.</p>
        </Step>

        <Step n={5} title="Test the integration">
          <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1">
            <li>Visit your website&apos;s Contact page in an <strong>incognito window</strong></li>
            <li>Fill in the form and submit</li>
            <li>Open Claudio → <strong>Intake</strong> — the new lead should appear within seconds</li>
          </ol>
        </Step>
      </section>

      <div className="mt-8 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
        <CheckCircle className="size-4 mt-0.5 shrink-0" />
        <span>
          Once connected, every form submission on your website automatically creates a new Intake
          lead in Claudio and triggers AI classification.
        </span>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        <span className="size-6 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {n}
        </span>
        <h2 className="font-medium text-slate-700 text-sm">{title}</h2>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
