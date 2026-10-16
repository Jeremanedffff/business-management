import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Industries />
      <Security />
      <Pricing />
      <Testimonial />
      <FAQ />
      <Contact />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-bold text-lg text-gray-900">MalutiRecon</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#how-it-works" className="hover:text-gray-900">How it works</a>
            <a href="#features" className="hover:text-gray-900">Features</a>
            <a href="#pricing" className="hover:text-gray-900">Pricing</a>
            <a href="#faq" className="hover:text-gray-900">FAQ</a>
            <a href="#contact" className="hover:text-gray-900">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">Sign In</Link>
            <Link to="/login" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Get Started</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
            Built to comply with RSL Lekuka
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
            Modern accounting for <span className="text-blue-600">Lesotho businesses</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            Create fiscal invoices, calculate and manage levies, and stay ready for compliance all in one modern accounting system.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login" className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors">Get Started Free</Link>
            <a href="#how-it-works" className="px-6 py-3 bg-white text-gray-700 font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors">See how it works</a>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            <TrustStat value="15%" label="VAT Ready" />
            <TrustStat value="4+" label="Tax Types" />
            <TrustStat value="100%" label="Cloud Ready" />
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-3xl sm:text-4xl font-bold text-blue-600">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Set up your business",
      description: "Add your business details, VAT number and bank account. Takes under 2 minutes.",
    },
    {
      number: "02",
      title: "Create your first invoice",
      description: "Add a customer, pick products or services, and issue an invoice with per-line VAT.",
    },
    {
      number: "03",
      title: "Stay RSL-ready",
      description: "Every invoice carries the fiscal fields RSL requires. Automatic submission to RSL arrives with the Lekuka integration.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How it works</h2>
          <p className="mt-4 text-lg text-gray-600">Get from signup to your first invoice in minutes.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              <div className="text-5xl font-bold text-blue-100 mb-3">{s.number}</div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{s.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { title: "RSL-Ready Invoices", description: "Every invoice already carries the fiscal fields RSL requires. Full Lekuka submission is coming soon.", icon: "??", status: "coming" as const },
    { title: "Per-line VAT", description: "Calculate VAT individually on every invoice line, not just on the subtotal.", icon: "??", status: "live" as const },
    { title: "Multiple Tax Rates", description: "Support VAT, Electricity VAT, Tobacco Levy, Alcohol Levy and Plastic Bag Levy — fully configurable per tenant.", icon: "??", status: "live" as const },
    { title: "Inventory", description: "Track products and automatically apply default VAT and levy settings.", icon: "??", status: "coming" as const },
    { title: "Print Anywhere", description: "Generate beautiful A4 invoices and thermal receipts from the same data.", icon: "???", status: "coming" as const },
    { title: "Fiscal-Ready Architecture", description: "Built from day one for RSL Lekuka integration. Compliance engine in development.", icon: "??", status: "coming" as const },
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Everything your business needs</h2>
          <p className="mt-4 text-lg text-gray-600">Built specifically for businesses that need proper fiscal accounting.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="relative p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
              {f.status === "coming" ? (
                <span className="absolute top-4 right-4 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">Coming soon</span>
              ) : (
                <span className="absolute top-4 right-4 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">Available now</span>
              )}
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Industries() {
  const industries = ["Retail Shops", "Supermarkets", "Restaurants", "Pharmacies", "Hardware Stores", "Service Businesses"];
  return (
    <section id="industries" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Made for every business</h2>
          <p className="mt-4 text-lg text-gray-600">Whether you run a shop, a restaurant, or a professional service — MalutiRecon fits.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {industries.map((i) => (
            <div key={i} className="px-5 py-3 bg-white rounded-full border border-gray-200 text-sm font-medium text-gray-700 shadow-sm">{i}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Security() {
  const items = [
    { icon: "??", title: "Encrypted end to end", description: "Your data is encrypted in transit and at rest, with HTTPS everywhere." },
    { icon: "??", title: "Daily cloud backups", description: "Automatic backups mean you never lose an invoice, even if a device fails." },
    { icon: "??", title: "Full audit trail", description: "Every invoice change, submission and payment is logged for compliance." },
    { icon: "????", title: "Built in Lesotho", description: "Designed from the ground up for Lesotho VAT, levies and RSL requirements." },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Security & compliance</h2>
          <p className="mt-4 text-lg text-gray-600">Your business data deserves enterprise-grade protection.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.title} className="p-6 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Simple, honest pricing</h2>
          <p className="mt-4 text-lg text-gray-600">One plan with everything you need. No hidden fees. Cancel anytime.</p>
        </div>
        <div className="max-w-md mx-auto">
          <div className="p-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl text-white shadow-xl">
            <div className="text-sm font-medium text-blue-100 uppercase tracking-wide">Early Access Plan</div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-bold">Pricing</span>
              <span className="text-blue-100">coming soon</span>
            </div>
            <p className="mt-2 text-sm text-blue-100">
              Join the waitlist for founding-member pricing and priority onboarding.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              <li className="flex items-center gap-2"><span className="text-blue-200">?</span> Unlimited invoices</li>
              <li className="flex items-center gap-2"><span className="text-blue-200">?</span> Per-line VAT & levy calculation</li>
              <li className="flex items-center gap-2"><span className="text-blue-200">?</span> Multiple tax rates & currencies</li>
              <li className="flex items-center gap-2"><span className="text-blue-200">?</span> Cloud storage & automatic backups</li>
              <li className="flex items-center gap-2"><span className="text-blue-200">?</span> Priority support</li>
            </ul>
            <a href="#contact" className="mt-8 block text-center px-6 py-3 bg-white text-blue-600 font-medium rounded-md hover:bg-blue-50 transition-colors">Join the waitlist</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="text-5xl text-blue-600 mb-6">"</div>
        <p className="text-2xl sm:text-3xl font-medium text-gray-900 leading-relaxed">Finally, an accounting system that understands Lesotho VAT and levies.</p>
        <div className="mt-8 text-sm text-gray-600">
          <p className="font-semibold text-gray-900">Retail Business Owner</p>
          <p>Maseru, Lesotho</p>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: "Can I use multiple tax rates?", a: "Yes. You can apply different VAT rates and levies on individual invoice lines — VAT, Electricity VAT, Tobacco Levy, Alcohol Levy, Plastic Bag Levy, or any custom rate you configure." },
    { q: "Does it support fiscal invoices?", a: "Every invoice carries the fiscal fields RSL requires (fiscal period, sequential counters, signature). Full automatic submission to RSL Lekuka is coming soon." },
    { q: "Can I print receipts?", a: "Thermal receipt and A4 invoice printing is coming soon. All fiscal data is stored securely and ready for printing once the feature is released." },
    { q: "Is my data safe?", a: "All data is encrypted in transit (HTTPS) and at rest. Backups run automatically. Every action is logged in an immutable audit trail." },
    { q: "Do I need to be VAT-registered?", a: "No. You can use MalutiRecon whether or not you are VAT-registered. If you are registered, we support full VAT workflows. If not, you can still issue standard invoices." },
    { q: "Can I import my existing customers?", a: "Customer import from CSV and Excel is on our roadmap. In the meantime, our team can help migrate your data during onboarding." },
    { q: "Does it work offline?", a: "The web app requires internet. Offline invoice queuing is planned as part of the RSL compliance roadmap." },
    { q: "Can I manage multiple branches?", a: "Multi-branch support is planned. The data model already supports branches per tenant for RSL configuration." },
  ];

  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details key={i} className="group bg-white border border-gray-200 rounded-lg overflow-hidden">
              <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50">
                <span className="font-medium text-gray-900">{faq.q}</span>
                <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl">+</span>
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">{faq.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setSubmitted(true);
      setBusy(false);
    }, 500);
  }

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Talk to us</h2>
            <p className="text-lg text-gray-600 mb-8">Have a question, want a demo, or ready to get your business set up? We usually reply within a few hours.</p>
            <div className="space-y-4">
              <ContactRow icon="??" label="WhatsApp" value="+266 1234 5678" href="https://wa.me/26612345678" />
              <ContactRow icon="??" label="Email" value="hello@malutirecon.co.ls" href="mailto:hello@malutirecon.co.ls" />
              <ContactRow icon="??" label="Phone" value="+266 1234 5678" href="tel:+26612345678" />
              <ContactRow icon="??" label="Office" value="Maseru, Lesotho" href="#" />
            </div>
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-900"><strong>Support hours:</strong> Monday to Friday, 8:00 – 17:00 (SAST)</p>
            </div>
          </div>
          <div>
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Join the early access waitlist</h3>
              {submitted ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  ? Thank you! We will be in touch soon.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.co.ls"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {busy ? "Sending..." : "Notify me"}
                  </button>
                  <p className="text-xs text-gray-500">We will never share your email. Unsubscribe anytime.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactRow({ icon, label, value, href }: { icon: string; label: string; value: string; href: string }) {
  return (
    <a href={href} className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-100 hover:border-blue-300 transition-colors">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </a>
  );
}

function FinalCTA() {
  return (
    <section className="py-20 bg-blue-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
        <h2 className="text-3xl sm:text-4xl font-bold">Ready to simplify your accounting?</h2>
        <p className="mt-4 text-lg text-blue-100">Start creating compliant fiscal invoices in minutes.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/login" className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-md hover:bg-blue-50 transition-colors">Get Started Free</Link>
          <a href="#contact" className="px-8 py-3 bg-blue-700 text-white font-semibold rounded-md hover:bg-blue-800 transition-colors border border-blue-500">Talk to us</a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="font-bold text-white text-lg">MalutiRecon</span>
            </div>
            <p className="text-sm max-w-sm mb-4">Modern accounting software for Lesotho businesses.</p>
            <p className="text-xs text-slate-500">Made with care in Maseru, Lesotho.</p>
          </div>
          <div>
            <p className="text-white font-semibold text-sm mb-3">Product</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#how-it-works" className="hover:text-white">How it works</a></li>
              <li><a href="#features" className="hover:text-white">Features</a></li>
              <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
              <li><a href="#faq" className="hover:text-white">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-semibold text-sm mb-3">Company</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#contact" className="hover:text-white">Contact</a></li>
              <li><a href="#contact" className="hover:text-white">Support</a></li>
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© 2026 MalutiRecon. All rights reserved.</p>
          <p>Built in Lesotho ????</p>
        </div>
      </div>
    </footer>
  );
}

