/**
 * Client-Side Microsoft Word (.DOCX) Generator
 * Uses JSZip to modify the official letterhead.docx template without disturbing header, logos, or styles.
 */

window.DocxExporter = {
  escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  },

  htmlToDocxRuns(htmlSnippet) {
    // Basic parser for inline <strong>, <b>, <em>, <i> tags
    const temp = document.createElement('div');
    temp.innerHTML = htmlSnippet;
    const runs = [];

    function traverse(node, isBold = false, isItalic = false) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text) {
          runs.push({ text, bold: isBold, italic: isItalic });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        const bold = isBold || tag === 'strong' || tag === 'b';
        const italic = isItalic || tag === 'em' || tag === 'i';
        for (let child of node.childNodes) {
          traverse(child, bold, italic);
        }
      }
    }

    for (let child of temp.childNodes) {
      traverse(child);
    }

    if (runs.length === 0) {
      runs.push({ text: temp.textContent || '', bold: false, italic: false });
    }

    return runs.map(r => {
      const bTag = r.bold ? '<w:b/><w:bCs/>' : '';
      const iTag = r.italic ? '<w:i/><w:iCs/>' : '';
      return `<w:r><w:rPr>${bTag}${iTag}<w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${DocxExporter.escapeXml(r.text)}</w:t></w:r>`;
    }).join('');
  },

  async generateDocx(letter) {
    if (!window.JSZip) {
      alert('JSZip library is not loaded. Please check assets/jszip.min.js.');
      return;
    }
    if (!window.DOCX_TEMPLATE_B64) {
      alert('Official letterhead template is missing.');
      return;
    }

    const zip = new JSZip();
    // Load binary from Base64
    await zip.loadAsync(window.DOCX_TEMPLATE_B64, { base64: true });

    // Prepare clean XML parts
    const xmlParts = [];
    xmlParts.append = (str) => xmlParts.push(str);

    xmlParts.append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
    xmlParts.append('<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">');
    xmlParts.append('<w:body>');

    // Date & Recipient Block
    const dateFormatted = letter.dateFormatted || letter.date || '';
    const recName = letter.recipient?.name || '';
    const recDesig = letter.recipient?.designation || '';
    const recInst = letter.recipient?.institution || 'Sinhgad Institute of Technology, Lonavala';

    xmlParts.append(`<w:p>
      <w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Date : ${this.escapeXml(dateFormatted)}</w:t></w:r>
      <w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:br/><w:br/></w:r>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>To,</w:t></w:r>
      <w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:br/><w:t>${this.escapeXml(recName)}</w:t></w:r>
      <w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:br/><w:t>${this.escapeXml(recDesig)}</w:t></w:r>
      <w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:br/><w:t>${this.escapeXml(recInst)}</w:t></w:r>
    </w:p>`);

    // Subject
    let subjectText = letter.subject || '';
    if (!subjectText.toLowerCase().startsWith('subject:')) {
      subjectText = 'Subject: ' + subjectText;
    }
    xmlParts.append(`<w:p>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${this.escapeXml(subjectText)}</w:t></w:r>
    </w:p>`);

    // Salutation
    xmlParts.append(`<w:p>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${this.escapeXml(letter.salutation || 'Respected Sir,')}</w:t></w:r>
    </w:p>`);

    // Body Paragraphs (parsed from HTML or plaintext)
    const contentHtml = letter.content || '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentHtml;
    const pElements = tempDiv.querySelectorAll('p');

    if (pElements.length > 0) {
      pElements.forEach(p => {
        const runsXml = this.htmlToDocxRuns(p.innerHTML);
        xmlParts.append(`<w:p>${runsXml}</w:p>`);
      });
    } else {
      // Split by newlines
      const lines = contentHtml.split('\n').filter(l => l.trim().length > 0);
      lines.forEach(line => {
        xmlParts.append(`<w:p><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${this.escapeXml(line)}</w:t></w:r></w:p>`);
      });
    }

    // Sign-off
    const signoff = letter.signoff || 'Yours sincerely,';
    const entity = letter.entity || 'Team IIC';
    const org = letter.organization || 'Sinhgad Institute of Technology, Lonavala';

    xmlParts.append(`<w:p>
      <w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>${this.escapeXml(signoff)}</w:t></w:r>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:br/><w:t>${this.escapeXml(entity)}</w:t></w:r>
      <w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:br/><w:t>${this.escapeXml(org)}</w:t></w:r>
    </w:p>`);

    // Spacer
    xmlParts.append('<w:p><w:pPr><w:rPr><w:sz w:val="24"/></w:rPr></w:pPr></w:p>');

    // Signatures Table
    const signers = letter.signatories || [];
    const s1 = signers[0] || { name: '', designation: '' };
    const s2 = signers[1] || { name: '', designation: '' };

    xmlParts.append(`<w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="0" w:type="auto"/>
        <w:tblBorders>
          <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="4500"/>
        <w:gridCol w:w="900"/>
        <w:gridCol w:w="4500"/>
      </w:tblGrid>
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>${this.escapeXml(s1.name)}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p/></w:tc>
        <w:tc><w:p><w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>${this.escapeXml(s2.name)}</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>${this.escapeXml(s1.designation)}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p/></w:tc>
        <w:tc><w:p><w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>${this.escapeXml(s2.designation)}</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>`);

    // Spacer & Footer Letter ID
    xmlParts.append('<w:p><w:pPr><w:rPr><w:sz w:val="24"/></w:rPr></w:pPr></w:p>');
    xmlParts.append(`<w:p>
      <w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>Letter ID: ${this.escapeXml(letter.letterId || '')}</w:t></w:r>
    </w:p>`);

    // Section properties preserving exact headerReference and page setup
    xmlParts.append('<w:sectPr w:rsidR="00406AE6" w:rsidRPr="00406AE6"><w:headerReference w:type="default" r:id="rId7"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="80" w:right="1406" w:bottom="280" w:left="1140" w:header="0" w:footer="0" w:gutter="0"/><w:cols w:space="720"/><w:formProt w:val="0"/><w:docGrid w:linePitch="100"/></w:sectPr>');
    xmlParts.append('</w:body></w:document>');

    const documentXmlContent = xmlParts.join('');

    // Replace document.xml inside the zip
    zip.file('word/document.xml', documentXmlContent);

    // Generate blob and trigger download
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const cleanId = (letter.letterId || 'IIC_Document').replace(/[\/\\]/g, '_');
    const filename = `${cleanId}.docx`;

    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadLink.href);

    window.showToast(`Exported ${filename} successfully!`, 'success');
  }
};
