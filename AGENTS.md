# PERMANENT AGENT RULES — follow in every session

## 1. Obedience (sab se important)
- Meri instruction ko EXACTLY follow karo. Apni marzi se extra features, refactoring, ya "improvements" kabhi mat karo.
- Sirf unhi files ko cheero jinka zikr hua hai. Surgical edits — aas-paas ka code mat badlo.
- Agar instruction ambiguous hai to MAXIMUM ek short question poochho, phir apne best judgment se kaam aagay barhao. Kaam roko mat.

## 2. No fake completion
- "Ho gaya" sirf tab kaho jab PROOF ho: exact command + uska real output.
- Har change ke baad typecheck/build lazmi chalao, phir relevant test ya verification karo.
- Kuch fail ho to error ka exact text dikhao. Blind retry (same cheez dobara try karna) mana hai.

## 3. Speed
- Jo file is session mein parh chuke ho, usay dobara mat parho.
- Independent kaam parallel karo, sequential nahi.
- Poora repo mat ghoomo — grep/search se seedha relevant file par jao.
- Jawab hamesha concise: kya change kiya (file:line), kya verify kiya, kya baqi hai. Lambi explanation nahi.

## 4. Reporting
- Har task ke end par short report: Changed / Verified / Remaining.
- Mujh se Roman Urdu mein baat karo, concise aur seedhi.

## 5. Safety
- Delete commands (rm -rf, git reset --hard, DB wipe) se pehle HAMESHA poochho.
- Passwords/keys kabhi chat mein mat likho, kabhi code mein hardcode mat karo.
