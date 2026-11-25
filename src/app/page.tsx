'use client'

import { useState } from 'react'

export default function Home() {
  const [output, setOutput] = useState<string>('Click "Run Gate Test" to test the API')

  const runGateTest = async () => {
    setOutput('Running gate test...\n')
    try {
      // Step 1: Create a trip
      const tripRes = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Gate Test Trip' }),
      })
      const trip = await tripRes.json()
      setOutput(prev => prev + `Created trip: ${trip.id}\n`)

      // Step 2: Add members
      const members = ['Aman', 'Bhavna', 'Chirag', 'Divya']
      const memberIds: string[] = []
      for (const name of members) {
        const mRes = await fetch(`/api/trips/${trip.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const member = await mRes.json()
        memberIds.push(member.id)
        setOutput(prev => prev + `Added member: ${name} (${member.id})\n`)
      }

      const [amanId, bhavnaId, chiragId, divyaId] = memberIds

      // Step 3: Add expenses
      // Hotel 600000 paid by Aman, split among all 4
      await fetch(`/api/trips/${trip.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidBy: amanId,
          amountPaise: 600000,
          category: 'stay',
          description: 'Hotel',
          splitType: 'equal',
          splitAmong: memberIds,
        }),
      })
      setOutput(prev => prev + 'Added expense: Hotel 600000 (Aman, equal among all)\n')

      // Fuel 180000 paid by Bhavna, split among Aman, Bhavna, Chirag
      await fetch(`/api/trips/${trip.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidBy: bhavnaId,
          amountPaise: 180000,
          category: 'fuel',
          description: 'Fuel',
          splitType: 'equal',
          splitAmong: [amanId, bhavnaId, chiragId],
        }),
      })
      setOutput(prev => prev + 'Added expense: Fuel 180000 (Bhavna, equal among Aman, Bhavna, Chirag)\n')

      // Dinner 120000 paid by Chirag, split among all 4
      await fetch(`/api/trips/${trip.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidBy: chiragId,
          amountPaise: 120000,
          category: 'food',
          description: 'Dinner',
          splitType: 'equal',
          splitAmong: memberIds,
        }),
      })
      setOutput(prev => prev + 'Added expense: Dinner 120000 (Chirag, equal among all)\n')

      // Step 4: Get balances
      const balRes = await fetch(`/api/trips/${trip.id}/balances`)
      const balances = await balRes.json()
      setOutput(prev => prev + '\nBalances:\n' + JSON.stringify(balances, null, 2) + '\n')

      // Verify expected nets
      const expected = {
        [amanId]: 360000,
        [bhavnaId]: -60000,
        [chiragId]: -120000,
        [divyaId]: -180000,
      }
      let pass = true
      for (const b of balances) {
        if (b.netPaise !== expected[b.memberId]) {
          setOutput(prev => prev + `❌ MISMATCH: ${b.name} expected ${expected[b.memberId]} got ${b.netPaise}\n`)
          pass = false
        }
      }
      if (pass) setOutput(prev => prev + '✅ All balances match expected!\n')

      // Step 5: Get settlements
      const setRes = await fetch(`/api/trips/${trip.id}/settlements?mode=optimal`)
      const settlements = await setRes.json()
      setOutput(prev => prev + '\nOptimal Settlements:\n' + JSON.stringify(settlements, null, 2) + '\n')

      if (settlements.paymentCount === 3 && settlements.payments.every((p: any) => p.to === amanId)) {
        setOutput(prev => prev + '✅ Optimal: 3 payments, all to Aman!\n')
      } else {
        setOutput(prev => prev + `❌ Expected 3 payments to Aman, got ${settlements.paymentCount} payments\n`)
      }

      // Step 6: Get nudges
      const nudgeRes = await fetch(`/api/trips/${trip.id}/nudges`)
      const nudges = await nudgeRes.json()
      setOutput(prev => prev + '\nNudges:\n' + JSON.stringify(nudges, null, 2) + '\n')

      setOutput(prev => prev + '\n🎉 Gate test complete!')
    } catch (err) {
      setOutput(prev => prev + '\n❌ Error: ' + err)
    }
  }

  return (
    <div className="container">
      <h1>RED Trip Splitter - API Test Page</h1>
      <div className="card">
        <button className="btn" onClick={runGateTest}>Run Gate Test</button>
        <pre style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>{output}</pre>
      </div>
    </div>
  )
}