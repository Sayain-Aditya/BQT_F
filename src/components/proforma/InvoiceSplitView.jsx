import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import mksLogo from "../../assets/Logo.jpeg";
import bktLogo from "../../assets/bqt.png";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { saveProforma, getProforma, updateProforma } from "../../api/proformaInvoiceApi";

// ---------- helpers ----------
const inr2 = (n) => (isNaN(n) ? 0 : n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Tolerant number parser: strips commas, currency symbols, and stray spaces before parsing,
// so values like "23,49,387.48" or "₹23,49,387.48" don't collapse to 0/NaN.
const num = (v) => {
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  if (v == null) return 0;
  const cleaned = String(v).replace(/[₹,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const onesWords = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
  "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
const tensWords = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
function twoDigits(n) { if (n < 20) return onesWords[n]; return tensWords[Math.floor(n / 10)] + (n % 10 ? "-" + onesWords[n % 10] : ""); }
function numberToWordsLakh(num) {
  num = Math.round(num);
  if (num === 0) return "ZERO";
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const hundred = num;
  let parts = [];
  if (lakh) parts.push((lakh < 20 ? onesWords[lakh] : twoDigits(lakh)) + "-LAKH" + (lakh > 1 ? "S" : ""));
  if (thousand) parts.push((thousand < 20 ? onesWords[thousand] : twoDigits(thousand)) + " THOUSAND");
  if (hundred) parts.push((hundred < 100 ? twoDigits(hundred) : Math.floor(hundred / 100) + " HUNDRED " + twoDigits(hundred % 100)));
  return parts.join(" ").trim();
}

const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const highlightAccountNumber = (text) => {
  if (!text) return text;
  const token = "222110870000016";
  const label = "BankAccountNo";
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedLabel}|${escapedToken})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    const normalized = part.toLowerCase();
    const isToken = normalized === token.toLowerCase();
    const isLabel = normalized === label.toLowerCase();

    if (isToken || isLabel) {
      return (
        <b key={`${part}-${index}`} style={{ fontWeight: 700 }}>
          {part}
        </b>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
};

const initialData = {
  refNo: "",
  date: today,
  to: { name: "", address: "", mob: "", email: "", gst: "", state: "", stateCode: "" },
  shipTo: "",
  hpn: "",
  items: [{ description: "", qty: 1, unitPrice: 0, finalPrice: "", priceSource: "unit" }],
  gstPercent: 18,
  roundedTotal: "",
  otherTerms: "100% payment immediately upon delivery.",
  paymentTerms: "Account Name: Madhwendra Kumar Singh\nBank Name: Punjab National Bank\nBankAccountNo:222110870000016\nIFSC Code: PUNB0222110",
  validity: "15 days",
  footerCompany: "Madhwendra Kumar Singh",
  footerAddress: "162B, Adjacent to Lakme Salon, Siddharth Enclave, Taramandal, Gorakhpur, U.P. - 273017",
  footerGst: "09BBHPS7705R1Z0",
  footerEmail: "madhwendra05@gmail.com",
  footerMobile: "9194702095 | +91 9125821165",
};

// ---------- form field primitives (Tailwind versions) ----------
function Row({ label, children }) {
  return (
    <div className="mb-2">
      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">{label}</label>
      {children}
    </div>
  );
}
function Input(props) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full px-2 py-1.5 border border-gray-300 rounded-md text-[13px] font-inherit focus:outline focus:outline-2 focus:outline-green-700/20 focus:border-green-700 ${className}`}
    />
  );
}
function TextArea(props) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      rows={props.rows || 3}
      className={`w-full px-2 py-1.5 border border-gray-300 rounded-md text-[13px] font-inherit focus:outline focus:outline-2 focus:outline-green-700/20 focus:border-green-700 ${className}`}
    />
  );
}

export default function InvoiceSplitView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(initialData);
  const [docId, setDocId] = useState(id || null);
  const docIdRef = useRef(id || null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [logo, setLogo] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [mobileTab, setMobileTab] = useState("form");
  const autoSaveTimer = useRef(null);
  const isFirstRender = useRef(true);
  const skipNextAutosave = useRef(false);
  const printAreaRef = useRef(null);

  // Load existing proforma when editing
  useEffect(() => {
    if (!id) return;
    getProforma(id).then((p) => {
      const { _id, totals, amountInWords: _w, createdAt, updatedAt, __v, ...rest } = p;
      setData({ ...initialData, ...rest });
      setDocId(_id);
      docIdRef.current = _id;
      skipNextAutosave.current = true;
      if (rest.logo) setLogo(rest.logo);
    }).catch(() => setSaveMsg("Failed to load invoice"));
  }, [id]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLogo(data.url);
    } catch (err) {
      setSaveMsg('Logo upload failed: ' + err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  const updateTo = (k, v) => setData((d) => ({ ...d, to: { ...d.to, [k]: v } }));
  const updateItem = (idx, k, v) => setData((d) => { const items = [...d.items]; items[idx] = { ...items[idx], [k]: v }; return { ...d, items }; });
  const setPrice = (idx, field, value) => setData((d) => {
    const items = [...d.items];
    items[idx] = { ...items[idx], [field]: value, priceSource: field === "finalPrice" ? "final" : "unit" };
    return { ...d, items };
  });
  const addRow = () => setData((d) => ({ ...d, items: [...d.items, { description: "", qty: 1, unitPrice: 0, finalPrice: "", priceSource: "unit" }] }));
  const removeRow = (idx) => setData((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));

  const calc = useMemo(() => {
    const gstPct = num(data.gstPercent);
    const priceDivisor = 1 + gstPct / 100;

    const rows = data.items.map((it) => {
      const qty = num(it.qty);
      const priceSource = it.priceSource || "unit";
      const unitPrice = priceSource === "final"
        ? num(it.finalPrice) / priceDivisor
        : num(it.unitPrice);
      const gstAmount = unitPrice * (gstPct / 100);
      const computedFinalPrice = unitPrice + gstAmount;
      return { ...it, unitPrice, totalPrice: qty * unitPrice, gstAmount, computedFinalPrice, gstPct, priceDivisor };
    });
    const subtotal = rows.reduce((s, r) => s + r.totalPrice, 0);
    const gstTotal = (subtotal * gstPct) / 100;
    const total = subtotal + gstTotal;
    const rounded = data.roundedTotal !== "" ? num(data.roundedTotal) : Math.round(total);
    return { rows, subtotal, gstTotal, total, rounded, gstPct, priceDivisor };
  }, [data.items, data.gstPercent, data.roundedTotal]);

  const amountInWords = "RUPEES - " + numberToWordsLakh(calc.rounded) + " ONLY.";

  // Autosave: debounce 2s after every data change
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (skipNextAutosave.current) { skipNextAutosave.current = false; return; }
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { doSave().catch(() => {}); }, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [data]);

  const doSave = async ({ throwOnError = false } = {}) => {
    setSaving(true); setSaveMsg("");
    try {
      const payload = { ...data, logo, totals: calc, amountInWords };
      if (docIdRef.current) {
        const updated = await updateProforma(docIdRef.current, payload);
        setSaveMsg("Saved");
        return updated;
      } else {
        const saved = await saveProforma(payload);
        setDocId(saved._id);
        docIdRef.current = saved._id;
        setSaveMsg("Saved");
        return saved;
      }
    } catch (error) {
      setSaveMsg(`Save failed: ${error.message}`);
      if (throwOnError) throw error;
      return null;
    }
    finally { setSaving(false); setTimeout(() => setSaveMsg(""), 3000); }
  };

  const getPdfFileName = () => {
    const label = data.refNo || data.to.name || "proforma-invoice";
    return `${label}`.trim().replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "") + ".pdf";
  };

  const createPdfBlob = async () => {
    if (!printAreaRef.current) throw new Error("Invoice preview is not ready");
    const canvas = await html2canvas(printAreaRef.current, {
      backgroundColor: "#ffffff",
      scale: Math.min(2, window.devicePixelRatio || 1),
      useCORS: true,
    });
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/png");

    let pageIndex = 0;
    let remainingHeight = imgHeight;
    while (remainingHeight > 0) {
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, margin - pageIndex * usableHeight, imgWidth, imgHeight);
      remainingHeight -= usableHeight;
      pageIndex += 1;
    }

    return pdf.output("blob");
  };

  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleSharePdf = async () => {
    setSharing(true);
    setSaveMsg("");
    try {
      await doSave({ throwOnError: true });
      const blob = await createPdfBlob();
      const fileName = getPdfFileName();
      const file = new File([blob], fileName, { type: "application/pdf" });
      const message = `Sharing ${data.refNo || "proforma invoice"} from MKS Alliance LLP.`;

      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ title: fileName, text: message, files: [file] });
        setSaveMsg("PDF ready to share");
      } else {
        downloadBlob(blob, fileName);
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${message} PDF downloaded. Please attach ${fileName} in WhatsApp.`)}`,
          "_blank",
          "noopener,noreferrer"
        );
        setSaveMsg("PDF downloaded");
      }
    } catch (error) {
      setSaveMsg(`Share failed: ${error.message}`);
    } finally {
      setSharing(false);
      setTimeout(() => setSaveMsg(""), 4000);
    }
  };

  const handlePrint = () => window.print();
  const handleSave = () => doSave();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 font-sans print:block print:h-auto print:bg-white">

      {/* MOBILE TAB BAR */}
      <div className="md:hidden flex border-b border-gray-300 bg-white print:hidden shrink-0">
        <button
          onClick={() => setMobileTab("form")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            mobileTab === "form" ? "text-green-700 border-b-2 border-green-700" : "text-gray-500"
          }`}
        >
          Form
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            mobileTab === "preview" ? "text-green-700 border-b-2 border-green-700" : "text-gray-500"
          }`}
        >
          Preview
        </button>
      </div>

      {/* LEFT: FORM */}
      <div className={`${
        mobileTab === "form" ? "flex" : "hidden"
      } md:flex flex-col w-full md:w-[400px] shrink-0 overflow-y-auto bg-white border-r border-gray-300 p-4 print:hidden`}>
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-800 text-lg leading-none">&larr;</button>
            <span className="font-bold text-base text-gray-800">{docId ? 'Edit Proforma' : 'New Proforma'}</span>
          </div>
          {saving && <span className="text-[11px] text-green-700 font-medium">Saving…</span>}
          {!saving && saveMsg && <span className="text-[11px] text-green-600 font-medium">{saveMsg}</span>}
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Logo</div>
          <label className="block text-[11px] font-semibold text-gray-700 mb-1">Upload Company Logo</label>
          <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={logoUploading} className="w-full text-[12px] text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 disabled:opacity-50" />
          {logoUploading && (
            <div className="mt-2 text-[11px] text-green-700 font-medium flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              Uploading logo…
            </div>
          )}
          {logo && (
            <div className="mt-2 flex items-center gap-2">
              <img src={logo} alt="logo preview" className="h-10 object-contain border border-gray-200 rounded p-1" />
              <button onClick={() => setLogo(null)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Reference</div>
          <Row label="Reference No"><Input value={data.refNo} onChange={(e) => setData((d) => ({ ...d, refNo: e.target.value }))} /></Row>
          <Row label="Date"><Input value={data.date} onChange={(e) => setData((d) => ({ ...d, date: e.target.value }))} /></Row>
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Customer Details</div>
          <Row label="Customer Name"><Input value={data.to.name} onChange={(e) => updateTo("name", e.target.value)} /></Row>
          <Row label="Address"><TextArea value={data.to.address} onChange={(e) => updateTo("address", e.target.value)} /></Row>
          <Row label="Mobile"><Input value={data.to.mob} onChange={(e) => updateTo("mob", e.target.value)} /></Row>
          <Row label="Email"><Input value={data.to.email} onChange={(e) => updateTo("email", e.target.value)} /></Row>
          <Row label="GSTIN"><Input value={data.to.gst} onChange={(e) => updateTo("gst", e.target.value)} /></Row>
          <Row label="State"><Input value={data.to.state} onChange={(e) => updateTo("state", e.target.value)} /></Row>
          <Row label="State Code"><Input value={data.to.stateCode} onChange={(e) => updateTo("stateCode", e.target.value)} /></Row>
          <Row label="Ship To"><Input value={data.shipTo} onChange={(e) => setData((d) => ({ ...d, shipTo: e.target.value }))} /></Row>
          <Row label="HPN"><Input value={data.hpn} onChange={(e) => setData((d) => ({ ...d, hpn: e.target.value }))} /></Row>
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Tax &amp; Totals</div>
          <Row label="GST %">
            <Input type="number" value={data.gstPercent} onChange={(e) => setData((d) => ({ ...d, gstPercent: e.target.value }))} />
          </Row>
          <Row label={`Rounded Total (auto: ₹${inr2(calc.total)})`}>
            <Input type="text" inputMode="decimal" placeholder="leave blank to auto-round" value={data.roundedTotal} onChange={(e) => setData((d) => ({ ...d, roundedTotal: e.target.value }))} />
          </Row>
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Items</div>
          <div className="text-[11px] text-gray-500 mb-2">
            Enter either Unit Price OR Final Price — the other fills in automatically.
          </div>
          {data.items.map((it, idx) => {
            const row = calc.rows[idx] || {};
            const priceSource = it.priceSource || "unit";
            return (
              <div className="border border-gray-200 rounded-md p-2 mb-2 relative" key={idx}>
                {data.items.length > 1 && (
                  <button
                    className="absolute top-1 right-1 bg-red-600 text-white border-none rounded w-[18px] h-[18px] text-[11px] leading-none cursor-pointer"
                    onClick={() => removeRow(idx)}
                  >
                    ×
                  </button>
                )}
                <Row label="Description"><Input value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} /></Row>
                <Row label="Qty (Pcs)"><Input type="number" value={it.qty} onChange={(e) => updateItem(idx, "qty", e.target.value)} /></Row>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <Row label={`Unit Price (before GST)${priceSource === "final" ? " — auto" : " ✏"}`}>
                    <Input
                      type="text" inputMode="decimal"
                      value={priceSource === "unit" ? it.unitPrice : inr2(row.unitPrice ?? 0)}
                      onChange={(e) => setPrice(idx, "unitPrice", e.target.value)}
                      className={priceSource === "final" ? "bg-gray-100 text-gray-500" : ""}
                    />
                  </Row>
                  <Row label={`Final Price (incl. GST)${priceSource === "unit" ? " — auto" : " ✏"}`}>
                    <Input
                      type="text" inputMode="decimal"
                      value={priceSource === "final" ? it.finalPrice : inr2(row.computedFinalPrice ?? 0)}
                      onChange={(e) => setPrice(idx, "finalPrice", e.target.value)}
                      className={priceSource === "unit" ? "bg-gray-100 text-gray-500" : ""}
                    />
                  </Row>
                </div>
                <Row label={`GST (${calc.gstPct}%) auto`}>
                  <Input readOnly value={inr2(row.gstAmount ?? 0)} className="bg-gray-100 text-gray-700" />
                </Row>
              </div>
            );
          })}
          <button
            className="w-full p-1.5 border border-dashed border-gray-400 rounded-md bg-gray-50 cursor-pointer text-xs font-semibold text-gray-700"
            onClick={addRow}
          >
            + Add Item
          </button>
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Terms &amp; Bank</div>
          <Row label="Terms of Payment">
            <TextArea value={data.otherTerms} rows={2} onChange={(e) => setData((d) => ({ ...d, otherTerms: e.target.value }))} />
          </Row>
          <Row label="Bank Details">
            <TextArea value={data.paymentTerms} rows={4} onChange={(e) => setData((d) => ({ ...d, paymentTerms: e.target.value }))} />
          </Row>
          <Row label="Validity"><Input value={data.validity} onChange={(e) => setData((d) => ({ ...d, validity: e.target.value }))} /></Row>
        </div>

        <div className="mb-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-200 pb-1">Company / Footer</div>
          <Row label="Company Name"><Input value={data.footerCompany} onChange={(e) => setData((d) => ({ ...d, footerCompany: e.target.value }))} /></Row>
          <Row label="Head Office Address"><TextArea value={data.footerAddress} rows={2} onChange={(e) => setData((d) => ({ ...d, footerAddress: e.target.value }))} /></Row>
          <Row label="GSTIN"><Input value={data.footerGst} onChange={(e) => setData((d) => ({ ...d, footerGst: e.target.value }))} /></Row>
          <Row label="Email"><Input value={data.footerEmail} onChange={(e) => setData((d) => ({ ...d, footerEmail: e.target.value }))} /></Row>
          <Row label="Mobile"><Input value={data.footerMobile} onChange={(e) => setData((d) => ({ ...d, footerMobile: e.target.value }))} /></Row>
        </div>
      </div>

      {/* RIGHT: LIVE PREVIEW */}
      <div className={`${
        mobileTab === "preview" ? "flex" : "hidden"
      } md:flex flex-1 overflow-y-auto p-2 md:p-6 flex-col items-center print:flex print:p-0 print:overflow-visible`}>
        <div className="flex justify-between items-center mb-4 w-full max-w-[900px] print:hidden">
          <span className="font-bold text-base text-gray-800">Live Preview</span>
          <div className="flex gap-2 items-center">
            {saveMsg && <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-md">{saveMsg}</span>}
            <button
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white cursor-pointer text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-green-800 text-white cursor-pointer text-sm font-semibold hover:bg-green-700 transition-colors"
              onClick={handlePrint}
            >
              Print / PDF
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-green-700 text-white cursor-pointer text-sm font-semibold hover:bg-green-600 disabled:opacity-60 transition-colors"
              onClick={handleSharePdf}
              disabled={saving || sharing}
            >
              {sharing ? "Preparing…" : "Share PDF"}
            </button>
          </div>
        </div>

        <div ref={printAreaRef} className="w-full max-w-[860px] bg-white print:w-auto print-area" style={{fontFamily:'Arial,sans-serif',fontSize:'11px',color:'#000',padding:'24px 28px'}}>

          {/* ── HEADER: MKS logo | Company Name | BKT/brand logo ── */}
          <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'4px'}}><tbody><tr>
            <td style={{width:'80px',verticalAlign:'middle'}}>
              <img src={mksLogo} alt="MKS" style={{width:'72px',height:'72px',objectFit:'contain'}} />
            </td>
            <td style={{verticalAlign:'middle',textAlign:'center'}}>
              <div style={{fontSize:'26px',fontWeight:'900',color:'#000',letterSpacing:'0.5px'}}>M/s Madhwendra Kumar Singh.</div>
            </td>
            <td style={{width:'90px',verticalAlign:'middle',textAlign:'right'}}>
              {logo
                ? <img src={logo} alt="brand" style={{height:'60px',objectFit:'contain'}} />
                : <img src={bktLogo} alt="BKT" style={{height:'60px',objectFit:'contain'}} />
              }
            </td>
          </tr></tbody></table>

          {/* ── QUOTATION title ── */}
          <div style={{textAlign:'center',fontWeight:'700',fontSize:'13px',textDecoration:'underline',marginBottom:'10px'}}>Quotation</div>

          {/* ── DATE + REF NO ── */}
          <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'10px'}}><tbody><tr>
            <td style={{fontSize:'11px'}}><strong>Date:</strong> {data.date}</td>
            <td style={{fontSize:'11px',textAlign:'right'}}><strong>Ref No:</strong> {data.refNo}</td>
          </tr></tbody></table>

          {/* ── CUSTOMER DETAILS ── */}
          <div style={{marginBottom:'12px'}}>
            <div style={{fontWeight:'700',textDecoration:'underline',marginBottom:'4px',fontSize:'11px'}}>Customer Details</div>
            <div><strong>Customer Name:</strong> {data.to.name}</div>
            <div><strong>Address:</strong> {data.to.address}</div>
            {data.to.mob && <div><strong>Mobile:</strong> {data.to.mob}</div>}
            {data.to.state && <div><strong>State:</strong> {data.to.state}{data.to.stateCode ? ` - ${data.to.stateCode}` : ''}</div>}
            {data.to.gst && <div><strong>GSTIN:</strong> {data.to.gst}</div>}
            {data.shipTo && <div><strong>Ship To:</strong> {data.shipTo}</div>}
            {data.hpn && <div><strong>HPN:</strong> {data.hpn}</div>}
          </div>

          {/* ── PRODUCTS DETAILS TABLE ── */}
          <div style={{fontWeight:'700',textAlign:'center',textDecoration:'underline',marginBottom:'4px',fontSize:'12px'}}>Products Details</div>
          <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'0',fontSize:'11px'}}>
            <thead>
              <tr style={{background:'#f0f0f0'}}>
                <th style={{border:'1px solid #999',padding:'5px 6px',textAlign:'center',width:'40px'}}>S. No.</th>
                <th style={{border:'1px solid #999',padding:'5px 6px',textAlign:'center'}}>Description</th>
                <th style={{border:'1px solid #999',padding:'5px 6px',textAlign:'center',width:'55px'}}>Qty</th>
                <th style={{border:'1px solid #999',padding:'5px 6px',textAlign:'center',width:'110px'}}>Unit Price (₹)</th>
                <th style={{border:'1px solid #999',padding:'5px 6px',textAlign:'center',width:'110px'}}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {calc.rows.map((it, idx) => (
                <tr key={idx}>
                  <td style={{border:'1px solid #999',padding:'5px 6px',textAlign:'center'}}>{idx+1}</td>
                  <td style={{border:'1px solid #999',padding:'5px 6px',textAlign:'center',fontWeight:'600'}}>{it.description || '—'}</td>
                  <td style={{border:'1px solid #999',padding:'5px 6px',textAlign:'center'}}>{it.qty} Pcs</td>
                  <td style={{border:'1px solid #999',padding:'5px 6px',textAlign:'right'}}>{inr2(it.unitPrice)}</td>
                  <td style={{border:'1px solid #999',padding:'5px 6px',textAlign:'right'}}>{inr2(it.totalPrice)}</td>
                </tr>
              ))}
              {/* SUB-TOTAL */}
              <tr>
                <td style={{border:'1px solid #999',padding:'5px 6px'}} colSpan={2}></td>
                <td style={{border:'1px solid #999',padding:'5px 6px',textAlign:'center',fontWeight:'600'}}>1 Set</td>
                <td style={{border:'1px solid #999',padding:'5px 6px',fontWeight:'700',textAlign:'center'}}>SUB – TOTAL</td>
                <td style={{border:'1px solid #999',padding:'5px 6px',textAlign:'right',fontWeight:'600'}}>{inr2(calc.subtotal)}</td>
              </tr>
              {/* GST */}
              <tr>
                <td style={{border:'1px solid #999',padding:'5px 6px'}} colSpan={2}></td>
                <td style={{border:'1px solid #999',padding:'5px 6px'}}></td>
                <td style={{border:'1px solid #999',padding:'5px 6px',textAlign:'center'}}>GST @ {data.gstPercent}%</td>
                <td style={{border:'1px solid #999',padding:'5px 6px',textAlign:'right'}}>{inr2(calc.gstTotal)}</td>
              </tr>
              {/* GRAND TOTAL */}
              <tr>
                <td style={{border:'1px solid #999',padding:'5px 6px'}} colSpan={2}></td>
                <td style={{border:'1px solid #999',padding:'5px 6px'}}></td>
                <td style={{border:'1px solid #999',padding:'5px 6px',fontWeight:'700',textAlign:'center'}}>Grand Total (Rounded Off)</td>
                <td style={{border:'1px solid #999',padding:'5px 6px',textAlign:'right',fontWeight:'700'}}>{inr2(calc.rounded)}</td>
              </tr>
            </tbody>
          </table>

          {/* ── AMOUNT IN WORDS ── */}
          <div style={{marginTop:'8px',marginBottom:'8px',fontSize:'11px'}}>
            <strong><u>Amount in Words: –</u></strong> {amountInWords}
          </div>

          {/* ── TERMS OF PAYMENT ── */}
          <div style={{marginBottom:'8px',fontSize:'11px'}}>
            <strong><u>Terms of Payment: –</u></strong> {data.otherTerms}
          </div>

          {/* ── BANK DETAILS ── */}
          <div style={{marginBottom:'12px',fontSize:'11px'}}>
            <div style={{fontWeight:'700',textDecoration:'underline',marginBottom:'3px'}}>Bank Details: –</div>
            <div style={{whiteSpace:'pre-wrap'}}>{highlightAccountNumber(data.paymentTerms)}</div>
          </div>

          {/* ── SIGNATURE ── */}
          <div style={{fontSize:'11px',marginBottom:'16px'}}>
            <div><strong>For M/s {data.footerCompany}</strong></div>
            <div style={{marginTop:'2px'}}>Authorised Distributor – BKT Tyres</div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{borderTop:'1px solid #000',paddingTop:'6px',textAlign:'center',fontSize:'9.5px',color:'#000',lineHeight:'1.7'}}>
            <div><strong>Head Office:</strong> {data.footerAddress}</div>
            <div>Branch Offices: Sonbhadra | Varanasi | Gorakhpur</div>
            <div>Toll Free: 1800 891 6505 | Mob.: +91 {data.footerMobile}</div>
            <div>Email: {data.footerEmail} &nbsp; GSTIN: {data.footerGst}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
