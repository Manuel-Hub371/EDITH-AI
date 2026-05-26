import sys
sys.path.insert(0, ".")

from filesystem.create_document import doc_generator

# Sample markdown content similar to what the research synthesizer outputs
sample_content = """# Ghana's Inflation Rate: Impact on the Economy and Its Citizens

## Executive Summary

Ghana has experienced significant inflationary pressures over the past two years, with the headline inflation rate peaking at **54.1%** in December 2022, the highest recorded in over two decades. This report examines the root causes, economic implications, and the cascading effects on Ghanaian citizens.

---

## Context & Background

Ghana's economy, historically one of West Africa's most stable, has faced mounting structural challenges. The convergence of global commodity price shocks, post-pandemic fiscal strain, and currency depreciation created a perfect storm for runaway inflation.

Key background factors include:

- **Currency Depreciation**: The Ghanaian Cedi lost over 50% of its value against the US Dollar in 2022.
- **Energy Prices**: Fuel and utility price hikes transmitted directly into consumer goods.
- **IMF Bailout**: In December 2022, Ghana entered a $3 billion IMF Extended Credit Facility program.

## Supporting Evidence

### Food and Non-Alcoholic Beverages

Food inflation consistently outpaced the headline rate, reaching **59.7%** at its peak. This disproportionately affected lower-income households, who allocate a higher share of income to food expenditure.

### Transport and Energy

Transport costs surged following subsidy removal and the devaluation of the Cedi, further straining household budgets. Public sector workers, informal traders, and rural communities bore the heaviest burden.

## Key Insights

The inflationary crisis has revealed structural vulnerabilities in Ghana's economic architecture:

- Over-reliance on commodity exports (gold, cocoa, oil) without value-added diversification.
- High public debt levels limiting fiscal space for counter-cyclical policy.
- Weak social safety nets inadequate to cushion inflation shocks for vulnerable populations.

## Risks & Limitations

- Data quality from informal sector reporting may understate actual price levels experienced by citizens.
- The IMF program's austerity conditions risk deepening short-term economic contraction.
- Recovery projections are contingent on stable global commodity markets, which remain uncertain.

---

## Conclusion

Ghana's inflation crisis is a multidimensional challenge requiring structural reform, debt restructuring, and targeted social protection measures. The path to macroeconomic stabilization, while underway, will require sustained policy discipline and international support.
"""

result = doc_generator.create_pdf("Test_Formatted_Report.pdf", r"C:\Users\USER\Desktop", sample_content)
print("PDF Result:", result)

result2 = doc_generator.create_word_document("Test_Formatted_Report.docx", r"C:\Users\USER\Desktop", "Ghana Inflation Report", sample_content)
print("DOCX Result:", result2)
