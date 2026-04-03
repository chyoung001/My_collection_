/**
 * PSA 연동 전까지 사용하는 cert 조회 스텁.
 */
export function buildPsaStub(certNumber) {
  const cn = String(certNumber);
  return {
    psaLookup: {
      CertificationType: "PSA",
      IsHologram: "false",
      IsReverseBarcode: "false",
      PSACert: {
        CertNumber: cn,
        Year: "2023",
        Category: "BASEBALL CARDS",
        SetName: "BOWMAN DRAFT",
        CardNumber: "BDC14",
        Subject: "PAUL SKENES",
        Variety: "CHROME-REFRACTOR",
        Grade: "10",
        QualifierCode: "",
        GradeDescription: "GEM MT 10",
      },
      PSAPopulation: {
        TotalPopulation: "1319",
        PopulationHigher: "0",
        TotalPopulationWithQualifier: "0",
        T206PopulationAllBacks: "",
        T206PopulationHigherAllBacks: "",
      },
      DNACert: null,
    },
    psaImages: [
      {
        IsFrontImage: true,
        ImageURL: `https://d1htnxwo4o0jhw.cloudfront.net/cert/${encodeURIComponent(cn)}/front.jpg`,
      },
      {
        IsFrontImage: false,
        ImageURL: `https://d1htnxwo4o0jhw.cloudfront.net/cert/${encodeURIComponent(cn)}/back.jpg`,
      },
    ],
  };
}
