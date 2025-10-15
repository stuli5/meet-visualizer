import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './App.css';

function App() {
  const [meetings, setMeetings] = useState(() => {
    const saved = localStorage.getItem('meetVisualizer_meetings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [
          {
            id: 1,
            date: '2025-10-15',
            company: 'T-mobile',
            participants: [
              { name: 'Vojto Laif', department: 'IT' }
            ],
            topics: ['DBT', 'Data Vault']
          },
          {
            id: 2,
            date: '2025-10-20',
            company: 'T-mobile',
            participants: [
              { name: 'Peter Novák', department: 'Data Analytics' },
              { name: 'Vojto Laif', department: 'IT' }
            ],
            topics: ['Data Vault', 'Snowflake']
          }
        ];
      }
    }
    return [
      {
        id: 1,
        date: '2025-10-15',
        company: 'T-mobile',
        participants: [
          { name: 'Vojto Laif', department: 'IT' }
        ],
        topics: ['DBT', 'Data Vault']
      },
      {
        id: 2,
        date: '2025-10-20',
        company: 'T-mobile',
        participants: [
          { name: 'Peter Novák', department: 'Data Analytics' },
          { name: 'Vojto Laif', department: 'IT' }
        ],
        topics: ['Data Vault', 'Snowflake']
      }
    ];
  });
  
  const [formData, setFormData] = useState({
    date: '',
    company: '',
    participants: '',
    topics: ''
  });

  const [editingId, setEditingId] = useState(null);

  const svgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [viewMode, setViewMode] = useState('graph');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth - 40;
        const height = Math.max(600, window.innerHeight - 300);
        setDimensions({ width, height });
      }
      setIsMobile(window.innerWidth <= 1024);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    localStorage.setItem('meetVisualizer_meetings', JSON.stringify(meetings));
  }, [meetings]);

  useEffect(() => {
    if (meetings.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = dimensions.width;
    const height = dimensions.height;

    if (viewMode === 'sankey') {
      const margin = { top: 60, right: 100, bottom: 60, left: 80 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = Math.max(800, height) - margin.top - margin.bottom;

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const layerSpacing = innerWidth / 5;
      
      const layers = [
        { name: 'Firmy', items: [], x: 0, color: '#ef4444' },
        { name: 'Meetingy', items: [], x: layerSpacing, color: '#3b82f6' },
        { name: 'Oddelenia', items: [], x: layerSpacing * 2, color: '#8b5cf6' },
        { name: 'Účastníci', items: [], x: layerSpacing * 3, color: '#10b981' },
        { name: 'Témy', items: [], x: layerSpacing * 4, color: '#f59e0b' }
      ];

      const connections = [];

      const companies = [...new Set(meetings.map(m => m.company))];
      const departments = [...new Set(meetings.flatMap(m => 
        m.participants.map(p => typeof p === 'string' ? 'Neurčené' : p.department)
      ))];
      const people = [...new Set(meetings.flatMap(m => 
        m.participants.map(p => typeof p === 'string' ? p : p.name)
      ))];
      const topics = [...new Set(meetings.flatMap(m => m.topics))];

      layers[0].items = companies;
      layers[1].items = meetings.map((m, i) => `${m.date}`);
      layers[2].items = departments;
      layers[3].items = people;
      layers[4].items = topics;

      const nodeHeight = 40;
      const nodePadding = 20;

      layers.forEach(layer => {
        const totalHeight = layer.items.length * (nodeHeight + nodePadding);
        const startY = (innerHeight - totalHeight) / 2;
        
        layer.items.forEach((item, i) => {
          layer[item] = {
            x: layer.x,
            y: startY + i * (nodeHeight + nodePadding),
            height: nodeHeight,
            name: item
          };
        });
      });

      meetings.forEach((meeting, idx) => {
        const meetingKey = `${meeting.date}`;
        
        if (layers[0][meeting.company] && layers[1][meetingKey]) {
          connections.push({
            source: layers[0][meeting.company],
            target: layers[1][meetingKey],
            color: layers[0].color
          });
        }

        const depts = [...new Set(meeting.participants.map(p => 
          typeof p === 'string' ? 'Neurčené' : p.department
        ))];
        depts.forEach(dept => {
          if (layers[1][meetingKey] && layers[2][dept]) {
            connections.push({
              source: layers[1][meetingKey],
              target: layers[2][dept],
              color: layers[1].color
            });
          }
        });

        meeting.participants.forEach(p => {
          const participant = typeof p === 'string' ? { name: p, department: 'Neurčené' } : p;
          if (layers[2][participant.department] && layers[3][participant.name]) {
            connections.push({
              source: layers[2][participant.department],
              target: layers[3][participant.name],
              color: layers[2].color
            });
          }
        });

        meeting.topics.forEach(topic => {
          if (layers[1][meetingKey] && layers[4][topic]) {
            connections.push({
              source: layers[1][meetingKey],
              target: layers[4][topic],
              color: layers[1].color
            });
          }
        });
      });

      connections.forEach(conn => {
        const path = `M ${conn.source.x + 15} ${conn.source.y + conn.source.height / 2}
                      C ${(conn.source.x + conn.target.x) / 2} ${conn.source.y + conn.source.height / 2},
                        ${(conn.source.x + conn.target.x) / 2} ${conn.target.y + conn.target.height / 2},
                        ${conn.target.x} ${conn.target.y + conn.target.height / 2}`;
        
        g.append('path')
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', conn.color)
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.2);
      });

      layers.forEach((layer, layerIndex) => {
        layer.items.forEach(item => {
          const node = layer[item];
          
          g.append('rect')
            .attr('x', node.x)
            .attr('y', node.y)
            .attr('width', 15)
            .attr('height', node.height)
            .attr('fill', layer.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('rx', 3);

          g.append('text')
            .attr('x', node.x + 20)
            .attr('y', node.y + node.height / 2)
            .attr('dy', '0.35em')
            .attr('font-size', '11px')
            .attr('font-weight', (layerIndex === 1 || layerIndex === 2 || layerIndex === 3) ? 'bold' : 'normal')
            .attr('fill', (layerIndex === 1 || layerIndex === 2 || layerIndex === 3) ? '#1f2937' : '#4b5563')
            .text(node.name);
        });
      });

      layers.forEach((layer, i) => {
        g.append('text')
          .attr('x', layer.x)
          .attr('y', -20)
          .attr('font-size', '13px')
          .attr('font-weight', 'bold')
          .attr('fill', layer.color)
          .text(layer.name);
      });

    } else if (viewMode === 'tree') {
      const margin = { top: 40, right: 40, bottom: 40, left: 40 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const hierarchyData = {
        name: 'Všetky meetingy',
        children: []
      };

      const companiesMap = new Map();
      meetings.forEach(meeting => {
        if (!companiesMap.has(meeting.company)) {
          companiesMap.set(meeting.company, {
            name: meeting.company,
            type: 'company',
            children: []
          });
        }
        
        const meetingNode = {
          name: meeting.date,
          type: 'meeting',
          children: []
        };

        const deptMap = new Map();
        meeting.participants.forEach(p => {
          const participant = typeof p === 'string' ? { name: p, department: 'Neurčené' } : p;
          if (!deptMap.has(participant.department)) {
            deptMap.set(participant.department, {
              name: participant.department,
              type: 'department',
              children: []
            });
          }
          deptMap.get(participant.department).children.push({
            name: participant.name,
            type: 'person'
          });
        });

        deptMap.forEach(dept => {
          meetingNode.children.push(dept);
        });

        meeting.topics.forEach(topic => {
          meetingNode.children.push({
            name: topic,
            type: 'topic'
          });
        });

        companiesMap.get(meeting.company).children.push(meetingNode);
      });

      hierarchyData.children = Array.from(companiesMap.values());

      const root = d3.hierarchy(hierarchyData);
      const treeLayout = d3.tree().size([innerHeight, innerWidth - 200]);
      treeLayout(root);

      const colorMap = {
        company: '#ef4444',
        meeting: '#3b82f6',
        department: '#8b5cf6',
        person: '#10b981',
        topic: '#f59e0b'
      };

      g.selectAll('.link')
        .data(root.links())
        .join('path')
        .attr('class', 'link')
        .attr('d', d3.linkHorizontal()
          .x(d => d.y)
          .y(d => d.x))
        .attr('fill', 'none')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1.5);

      const nodes = g.selectAll('.node')
        .data(root.descendants())
        .join('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.y},${d.x})`);

      nodes.append('circle')
        .attr('r', d => d.depth === 0 ? 8 : (d.data.type === 'meeting' ? 6 : 5))
        .attr('fill', d => {
          if (d.depth === 0) return '#6366f1';
          return colorMap[d.data.type] || '#94a3b8';
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      nodes.append('text')
        .text(d => d.data.name)
        .attr('x', 12)
        .attr('y', 4)
        .attr('font-size', d => d.depth === 0 ? '14px' : (d.data.type === 'meeting' ? '12px' : '11px'))
        .attr('font-weight', d => {
          if (d.depth === 0) return 'bold';
          if (d.data.type === 'company') return 'bold';
          if (d.data.type === 'meeting') return 'bold';
          if (d.data.type === 'department') return '600';
          return 'normal';
        })
        .attr('fill', d => {
          if (d.depth === 0) return '#1f2937';
          if (d.data.type === 'meeting') return '#1f2937';
          if (d.data.type === 'department') return '#6b21a8';
          return '#4b5563';
        });

    } else {
      const g = svg.append('g');

      const nodes = [];
      const links = [];
      const nodeMap = new Map();

      const addNode = (id, label, type) => {
        if (!nodeMap.has(id)) {
          const node = { id, label, type };
          nodes.push(node);
          nodeMap.set(id, node);
        }
        return nodeMap.get(id);
      };

      meetings.forEach((meeting) => {
        const meetingNode = addNode(`meeting-${meeting.id}`, `${meeting.date} - ${meeting.company}`, 'meeting');
        
        const companyNode = addNode(`company-${meeting.company}`, meeting.company, 'company');
        links.push({ source: meetingNode.id, target: companyNode.id });

        meeting.participants.forEach(p => {
          const participant = typeof p === 'string' ? { name: p, department: 'Neurčené' } : p;
          const deptNode = addNode(`dept-${participant.department}`, participant.department, 'department');
          const personNode = addNode(`person-${participant.name}`, participant.name, 'person');
          links.push({ source: meetingNode.id, target: deptNode.id });
          links.push({ source: deptNode.id, target: personNode.id });
        });

        meeting.topics.forEach(topic => {
          const topicNode = addNode(`topic-${topic}`, topic, 'topic');
          links.push({ source: meetingNode.id, target: topicNode.id });
        });
      });

      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      svg.call(zoom);

      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(40));

      const link = g.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', 2);

      const node = g.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      const colorMap = {
        meeting: '#3b82f6',
        company: '#ef4444',
        department: '#8b5cf6',
        person: '#10b981',
        topic: '#f59e0b'
      };

      node.append('circle')
        .attr('r', d => d.type === 'meeting' ? 25 : 20)
        .attr('fill', d => colorMap[d.type])
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      node.append('text')
        .text(d => d.label)
        .attr('x', 0)
        .attr('y', 35)
        .attr('text-anchor', 'middle')
        .attr('fill', '#1f2937')
        .attr('font-size', '12px')
        .attr('font-weight', '500');

      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
    }

  }, [meetings, dimensions, viewMode]);

  const handleAdd = () => {
    if (!formData.date || !formData.company || !formData.participants || !formData.topics) {
      return;
    }

    const parseParticipants = (str) => {
      return str.split(',').map(p => {
        const trimmed = p.trim();
        const match = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
          return { name: match[1].trim(), department: match[2].trim() };
        }
        return { name: trimmed, department: 'Neurčené' };
      }).filter(p => p.name);
    };

    if (editingId) {
      setMeetings(meetings.map(m => 
        m.id === editingId 
          ? {
              ...m,
              date: formData.date,
              company: formData.company,
              participants: parseParticipants(formData.participants),
              topics: formData.topics.split(',').map(t => t.trim()).filter(t => t)
            }
          : m
      ));
      setEditingId(null);
    } else {
      const newMeeting = {
        id: Date.now(),
        date: formData.date,
        company: formData.company,
        participants: parseParticipants(formData.participants),
        topics: formData.topics.split(',').map(t => t.trim()).filter(t => t)
      };
      setMeetings([...meetings, newMeeting]);
    }
    
    setFormData({ date: '', company: '', participants: '', topics: '' });
  };

  const startEdit = (meeting) => {
    setEditingId(meeting.id);
    setFormData({
      date: meeting.date,
      company: meeting.company,
      participants: meeting.participants.map(p => `${p.name} (${p.department})`).join(', '),
      topics: meeting.topics.join(', ')
    });
  };

  const deleteMeeting = (id) => {
    setMeetings(meetings.filter(m => m.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setFormData({ date: '', company: '', participants: '', topics: '' });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ date: '', company: '', participants: '', topics: '' });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(meetings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meetings.json';
    link.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          setMeetings(imported);
        } catch (error) {
          alert('Chyba pri načítaní súboru');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)', padding: '1.5rem' }}>
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '2rem', textAlign: 'center' }}>
          Meet Visualizer
        </h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '350px 1fr', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '1.5rem', height: 'fit-content', maxWidth: isMobile ? '600px' : 'none', margin: isMobile ? '0 auto' : '0', width: isMobile ? '100%' : 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
              {editingId ? 'Upraviť meeting' : 'Pridať meeting'}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Dátum</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Firma</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  placeholder="napr. T-mobile"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Účastníci (Meno (Oddelenie), ...)
                </label>
                <input
                  type="text"
                  value={formData.participants}
                  onChange={(e) => setFormData({...formData, participants: e.target.value})}
                  placeholder="napr. Vojto Laif (IT), Peter Novák (Data Analytics)"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                  Témy (oddelené čiarkou)
                </label>
                <input
                  type="text"
                  value={formData.topics}
                  onChange={(e) => setFormData({...formData, topics: e.target.value})}
                  placeholder="napr. DBT, Data Vault"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div
                  onClick={handleAdd}
                  style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500', textAlign: 'center', userSelect: 'none' }}
                >
                  {editingId ? 'Uložiť zmeny' : 'Pridať meeting'}
                </div>
                {editingId && (
                  <div
                    onClick={cancelEdit}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#d1d5db', color: '#374151', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500', userSelect: 'none' }}
                  >
                    Zrušiť
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>Zoznam meetingov</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '16rem', overflowY: 'auto' }}>
                {meetings.map(meeting => (
                  <div key={meeting.id} style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937' }}>
                      {meeting.date} - {meeting.company}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                      {meeting.participants.map(p => `${p.name} (${p.department})`).join(', ')}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <div
                        onClick={() => startEdit(meeting)}
                        style={{ fontSize: '0.75rem', backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', userSelect: 'none' }}
                      >
                        Upraviť
                      </div>
                      <div
                        onClick={() => deleteMeeting(meeting.id)}
                        style={{ fontSize: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', userSelect: 'none' }}
                      >
                        Zmazať
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div
                onClick={handleExport}
                style={{ width: '100%', backgroundColor: '#16a34a', color: 'white', padding: '0.5rem 0.5rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '500', textAlign: 'center', userSelect: 'none', fontSize: '0.875rem' }}
              >
                Exportovať data
              </div>
              
              <label style={{ display: 'block' }}>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'block', width: '100%', fontSize: '0.75rem', color: '#6b7280', cursor: 'pointer' }}
                />
              </label>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>Legenda</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '1rem', height: '1rem', borderRadius: '9999px', backgroundColor: '#dc2626' }}></div>
                  <span>Firma</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '1rem', height: '1rem', borderRadius: '9999px', backgroundColor: '#9333ea' }}></div>
                  <span>Oddelenie</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '1rem', height: '1rem', borderRadius: '9999px', backgroundColor: '#16a34a' }}></div>
                  <span>Osoba</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '1rem', height: '1rem', borderRadius: '9999px', backgroundColor: '#d97706' }}></div>
                  <span>Téma</span>
                </div>
              </div>
            </div>
          </div>

          <div ref={containerRef} style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '1.5rem', minHeight: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151' }}>
                {viewMode === 'graph' ? 'Graf meetingov' : viewMode === 'tree' ? 'Hierarchický strom' : 'Sankey diagram'}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div
                  onClick={() => setViewMode('graph')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    backgroundColor: viewMode === 'graph' ? '#2563eb' : '#e5e7eb',
                    color: viewMode === 'graph' ? 'white' : '#374151',
                    userSelect: 'none'
                  }}
                >
                  Graf
                </div>
                <div
                  onClick={() => setViewMode('tree')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    backgroundColor: viewMode === 'tree' ? '#2563eb' : '#e5e7eb',
                    color: viewMode === 'tree' ? 'white' : '#374151',
                    userSelect: 'none'
                  }}
                >
                  Strom
                </div>
                <div
                  onClick={() => setViewMode('sankey')}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    backgroundColor: viewMode === 'sankey' ? '#2563eb' : '#e5e7eb',
                    color: viewMode === 'sankey' ? 'white' : '#374151',
                    userSelect: 'none'
                  }}
                >
                  Sankey
                </div>
              </div>
            </div>
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '2px solid #e5e7eb', overflow: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
              <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                style={{ display: 'block', width: '100%' }}
              />
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.75rem' }}>
              {viewMode === 'graph' 
                ? 'Tip: Ťahaj uzly pre usporiadanie. Používaj koliesko myši pre zoom.' 
                : viewMode === 'tree'
                ? 'Tip: Hierarchia - Firmy → Meetingy → Oddelenia → Účastníci a Témy'
                : 'Tip: Flow diagram - Šírka spojení = intenzita vzťahov'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;